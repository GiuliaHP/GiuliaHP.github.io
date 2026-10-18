"""Windowed journal editor for the Giulia HP static site.

The editor deliberately keeps the site data plain JSON and the media files in
the repository so that every save can be committed and published normally.
"""

from __future__ import annotations

import argparse
import colorsys
import functools
import hashlib
import html
import io
import json
import logging
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import traceback
import uuid
import zlib
from datetime import date, datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote
from typing import Any

from PIL import Image, ImageSequence


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".gif", ".webp"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".avi", ".webm"}
# Containers the editor webview can play back; the rest only get a poster frame.
PLAYABLE_VIDEO_EXTENSIONS = {".mp4", ".m4v", ".webm"}


def _dialog_filter(label: str, extensions: set[str]) -> str:
    """Build a pywebview file filter, e.g. 'Images (*.jpg;*.png)'."""
    return "{} ({})".format(label, ";".join(f"*{ext}" for ext in sorted(extensions)))


MEDIA_FILE_TYPES = (
    _dialog_filter("Medias", IMAGE_EXTENSIONS | VIDEO_EXTENSIONS),
    _dialog_filter("Images", IMAGE_EXTENSIONS),
    _dialog_filter("Videos", VIDEO_EXTENSIONS),
    "Tous les fichiers (*.*)",
)

# Images are downscaled to 1920px on import, so the cap only rules out big videos.
INLINE_MEDIA_LIMIT = 12 * 1024 * 1024

# The editor is served over a loopback HTTP server rather than file://, so the
# page resolves media through exactly the same relative paths the site uses.
EDITOR_ROUTE = "/__editor__/"
STAGED_ROUTE = "/__staged__/"

TAG_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")

# The editor owns media layout; Python only copies the attributes through, so a
# new control in the page does not need a matching parser here (see Bug A).
LAYOUT_ATTRIBUTE = re.compile(r'\b(data-align|data-width|data-text-align)="([A-Za-z0-9-]{1,24})"')

logger = logging.getLogger("giuliahp.carnet")


def log_dir() -> Path:
    directory = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "GiuliaHP"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def configure_logging() -> Path:
    """Always log to disk so a crash leaves a trace instead of a silent exit."""
    log_path = log_dir() / "carnet.log"
    logging.basicConfig(
        filename=log_path,
        filemode="w",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        force=True,
    )
    return log_path


def repository_root() -> Path | None:
    """Find the site repository without assuming the launcher's working directory."""
    configured = os.environ.get("GIULIAHP_PROJECT_DIR")
    if configured:
        candidate = Path(configured).expanduser().resolve()
        return candidate if (candidate / "pages" / "index.html").exists() else None
    executable_dir = Path(sys.executable if getattr(sys, "frozen", False) else __file__).resolve().parent
    candidates = [Path.cwd().resolve(), executable_dir, *executable_dir.parents]
    for candidate in candidates:
        if (candidate / "pages" / "index.html").exists() and (candidate / "assets").is_dir():
            return candidate
    return None


def choose_project_dir() -> Path | None:
    """Ask for the website folder when the executable is launched elsewhere."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        selected = filedialog.askdirectory(
            title="Choisissez le dossier du site GiuliaHP.github.io",
            mustexist=True,
        )
        root.destroy()
    except Exception:
        return None
    candidate = Path(selected).resolve() if selected else None
    return candidate if candidate and (candidate / "pages" / "index.html").exists() and (candidate / "assets").is_dir() else None


def show_startup_error(error: Exception) -> None:
    log_path = log_dir() / "carnet-startup.log"
    log_path.write_text(traceback.format_exc(), encoding="utf-8")
    logger.exception("Startup failed")
    try:
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Giulia HP — Carnet", f"Impossible de démarrer l'éditeur.\n\n{error}\n\nDétail enregistré dans :\n{log_path}")
        root.destroy()
    except Exception:
        pass


def _editor_handler(project_dir: Path, staging_dir: Path, editor_page: Path):
    """Serve the repository, plus the bundled editor page and any staged media."""

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, directory=str(project_dir), **kwargs)

        def translate_path(self, path: str) -> str:
            route = unquote(path.split("?", 1)[0].split("#", 1)[0])
            if route in (EDITOR_ROUTE, EDITOR_ROUTE + "index.html"):
                return str(editor_page)
            if route.startswith(STAGED_ROUTE):
                return str(staging_dir / Path(route[len(STAGED_ROUTE):]).name)
            return super().translate_path(path)

        def end_headers(self) -> None:
            # the author edits these files while the window is open
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def log_message(self, fmt: str, *args: Any) -> None:
            logger.debug("http %s", fmt % args)

    return Handler


def start_editor_server(project_dir: Path, staging_dir: Path, editor_page: Path) -> ThreadingHTTPServer:
    """Bind a loopback server on a free port and serve it off a daemon thread."""
    handler = _editor_handler(project_dir, staging_dir, editor_page)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    except OSError as error:
        raise RuntimeError(f"Impossible de démarrer le serveur local de l'éditeur : {error}") from error
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, name="carnet-http", daemon=True).start()
    logger.info("Editor server on http://127.0.0.1:%s", server.server_address[1])
    return server

class JournalStore:
    def __init__(self, project_dir: Path | None = None) -> None:
        self.project_dir = (project_dir or repository_root()).resolve()
        self.data_path = self.project_dir / "assets" / "data" / "carnet_data.json"
        self.tags_path = self.project_dir / "assets" / "data" / "carnet_tags.json"
        self.media_dir = self.project_dir / "assets" / "carnet"
        self.staging_dir = Path(tempfile.mkdtemp(prefix="GiuliaHP-Carnet-"))
        self.staged_media: dict[str, dict[str, Any]] = {}
        self.materialized_media: dict[str, tuple[str, str]] = {}
        self.data_path.parent.mkdir(parents=True, exist_ok=True)
        self.media_dir.mkdir(parents=True, exist_ok=True)

    def load(self) -> list[dict[str, Any]]:
        if not self.data_path.exists():
            return []
        try:
            payload = json.loads(self.data_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid journal JSON in {self.data_path}: {exc}") from exc
        if not isinstance(payload, list):
            raise ValueError("Journal data must be a JSON array.")
        return [entry for entry in payload if isinstance(entry, dict)]

    def load_tag_colors(self) -> dict[str, str]:
        if not self.tags_path.exists():
            return {}
        try:
            payload = json.loads(self.tags_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            logger.warning("Ignoring malformed %s", self.tags_path.name)
            return {}
        if not isinstance(payload, dict):
            return {}
        return {str(tag): str(color).lower() for tag, color in payload.items() if TAG_COLOR.match(str(color))}

    def _write_tag_colors(self, colors: dict[str, str]) -> None:
        ordered = dict(sorted(colors.items(), key=lambda item: item[0].lower()))
        self.tags_path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    @staticmethod
    def default_tag_color(tag: str) -> str:
        """Give every tag a stable, readable hue derived from its name."""
        hue = zlib.crc32(tag.strip().lower().encode("utf-8")) % 360
        red, green, blue = colorsys.hls_to_rgb(hue / 360, 0.68, 0.62)
        return "#{:02x}{:02x}{:02x}".format(round(red * 255), round(green * 255), round(blue * 255))

    @staticmethod
    def match_tag(colors: dict[str, str], tag: str) -> str | None:
        """Find a tag's key in the palette, ignoring case.

        Renaming "animation" to "Animation" should keep the colour you picked
        rather than silently fall back to a fresh default.
        """
        clean = tag.strip()
        if clean in colors:
            return clean
        folded = clean.casefold()
        for key in colors:
            if key.casefold() == folded:
                return key
        return None

    def ensure_tag_colors(self, tags: list[str]) -> dict[str, str]:
        colors = self.load_tag_colors()
        missing = [tag for tag in tags if tag and self.match_tag(colors, tag) is None]
        for tag in missing:
            colors[tag] = self.default_tag_color(tag)
        if missing:
            self._write_tag_colors(colors)
        return colors

    def set_tag_color(self, tag: str, color: str) -> dict[str, str]:
        clean_tag = tag.strip()
        if not clean_tag:
            raise ValueError("Le tag est vide.")
        if not TAG_COLOR.match(color):
            raise ValueError(f"Couleur invalide : {color}")
        colors = self.load_tag_colors()
        existing = self.match_tag(colors, clean_tag)
        if existing is not None and existing != clean_tag:
            del colors[existing]          # keep one entry per tag, not one per spelling
        colors[clean_tag] = color.lower()
        self._write_tag_colors(colors)
        return colors

    def delete_entry(self, entry_id: str) -> dict[str, Any]:
        """Remove one entry and delete media no longer referenced by any entry."""
        entries = self.load()
        remaining = [entry for entry in entries if entry.get("id") != entry_id]
        if len(remaining) == len(entries):
            raise ValueError(f"Cette entrée n'existe plus : {entry_id}")
        self.data_path.write_text(json.dumps(remaining, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return {"id": entry_id, "remaining": len(remaining), "deleted_media": self.cleanup_unused_media()}

    def media_path(self, relative_path: str) -> Path:
        """Resolve a site-relative media path, refusing anything outside the project."""
        candidate = (self.project_dir / relative_path).resolve()
        if self.project_dir not in candidate.parents:
            raise ValueError("Media path must stay inside the project directory.")
        if not candidate.is_file():
            raise FileNotFoundError(f"Media file not found: {relative_path}")
        return candidate

    @staticmethod
    def _is_animated(image: Image.Image) -> bool:
        return getattr(image, "n_frames", 1) > 1

    @staticmethod
    def _has_alpha(image: Image.Image) -> bool:
        return image.mode in ("RGBA", "LA", "PA") or "transparency" in image.info

    @staticmethod
    def _fit(size: tuple[int, int], limit: int) -> tuple[int, int]:
        """Scale down to fit a square of `limit`, never up, ratio intact."""
        width, height = size
        if max(width, height) <= limit:
            return width, height
        ratio = limit / max(width, height)
        return max(1, round(width * ratio)), max(1, round(height * ratio))

    @staticmethod
    def _encode_webp(image: Image.Image, limit: int, quality: int) -> bytes:
        """WebP bytes for one image, keeping every frame of an animation.

        A GIF flattened to its first frame is the animation thrown away, so
        animated sources are re-encoded frame by frame instead.
        """
        target = JournalStore._fit(image.size, limit)
        buffer = io.BytesIO()
        if not JournalStore._is_animated(image):
            frame = image.convert("RGBA" if JournalStore._has_alpha(image) else "RGB")
            if target != frame.size:
                frame = frame.resize(target, Image.Resampling.LANCZOS)
            frame.save(buffer, "WEBP", quality=quality, method=6)
            return buffer.getvalue()
        frames, durations = [], []
        for frame in ImageSequence.Iterator(image):
            durations.append(frame.info.get("duration", 100))
            frames.append(frame.convert("RGBA").resize(target, Image.Resampling.LANCZOS))
        frames[0].save(
            buffer, "WEBP", save_all=True, append_images=frames[1:],
            duration=durations, loop=image.info.get("loop", 0),
            quality=quality, method=4, minimize_size=True,
        )
        return buffer.getvalue()
    def save_entry(
        self,
        title: str,
        entry_date: str,
        tags: str | list[str],
        body: str,
        entry_id: str | None = None,
    ) -> dict[str, Any]:
        clean_title = title.strip()
        if not clean_title:
            raise ValueError("A title is required.")
        try:
            datetime.strptime(entry_date, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError("Date must use YYYY-MM-DD format.") from exc
        normalized_tags = self._normalize_tags(tags)
        self.ensure_tag_colors([tag.strip() for tag in normalized_tags.split(",") if tag.strip()])
        body, media = self._materialize_staged_media(body)
        entries = self.load()
        identifier = entry_id or f"{datetime.now():%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:6]}"
        entry = {
            "id": identifier,
            "title": clean_title,
            "date": entry_date,
            "tags": normalized_tags,
            "body": body.strip(),
            "updated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        }
        replaced = False
        for index, existing in enumerate(entries):
            if existing.get("id") == identifier:
                entries[index] = entry
                replaced = True
                break
        if not replaced:
            entries.append(entry)
        entries.sort(key=lambda item: (str(item.get("date", "")), str(item.get("id", ""))), reverse=True)
        self.data_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return {**entry, "media": media}

    def stage_media(self, source: str) -> dict[str, Any]:
        source_path = Path(source).expanduser().resolve()
        suffix = source_path.suffix.lower()
        if not source_path.is_file():
            raise FileNotFoundError(f"Media file not found: {source_path}")
        if suffix in IMAGE_EXTENSIONS:
            kind = "image"
            with Image.open(source_path) as image:
                dimensions = f"{image.width} × {image.height} px"
        elif suffix in VIDEO_EXTENSIONS:
            kind = "video"
            dimensions = f"{suffix[1:].upper()} video"
        else:
            raise ValueError("format non pris en charge")   # shown in the editor status line
        token = uuid.uuid4().hex
        staged_path = self.staging_dir / f"{token}{suffix}"
        shutil.copy2(source_path, staged_path)
        self.staged_media[token] = {
            "source": staged_path,
            "kind": kind,
            "filename": source_path.name,
            "dimensions": dimensions,
        }
        return {
            "token": token, "kind": kind, "filename": source_path.name, "dimensions": dimensions,
            "url": f"{STAGED_ROUTE}{staged_path.name}",   # served straight off disk, no base64
        }

    MEDIA_PLACEHOLDER = re.compile(
        r'<div\b[^>]*data-media-token="([a-f0-9]+)"[^>]*>.*?</div>',
        re.IGNORECASE | re.DOTALL,
    )

    def _materialize_staged_media(self, body: str) -> tuple[str, dict[str, str]]:
        """Convert editor placeholders into real media tags, once per token.

        A token already written to disk is reused from ``materialized_media`` so
        that saving the same entry twice does not fail on a consumed token.
        """
        media: dict[str, str] = {}

        def replace(match: re.Match[str]) -> str:
            token = match.group(1)
            known = self.materialized_media.get(token)
            relative_path, original_name = known if known else (None, None)
            if relative_path is None:
                staged = self.staged_media.get(token)
                if staged is None:
                    raise ValueError(
                        "Un média inséré n'est plus disponible. Supprimez le bloc "
                        "et ajoutez-le de nouveau avant d'enregistrer."
                    )
                relative_path = self.process_media(
                    str(staged["source"]), staged["kind"], Path(staged["filename"]).stem
                )
                self.materialized_media[token] = (relative_path, staged["filename"])
                original_name = staged["filename"]
            media[token] = relative_path
            return self.render_media(relative_path, original_name, self._layout_attributes(match.group(0)))

        return self.MEDIA_PLACEHOLDER.sub(replace, body), media

    def cleanup_staging(self) -> None:
        """Remove this editor session's temporary files after the webview closes."""
        try:
            shutil.rmtree(self.staging_dir)
        except FileNotFoundError:
            return
        except OSError:
            logger.warning("Could not remove temporary staging directory %s", self.staging_dir, exc_info=True)

    @staticmethod
    def _layout_attributes(placeholder: str) -> str:
        """Echo back the layout the editor wrote on the placeholder.

        Re-deriving it here is how scale and float used to be lost on a new
        media's first save: the page learned an attribute this parser did not.
        """
        return "".join(f' {name}="{value}"' for name, value in LAYOUT_ATTRIBUTE.findall(placeholder))

    @staticmethod
    def render_media(relative_path: str, original_name: str, layout: str = "") -> str:
        if Path(relative_path).suffix.lower() in VIDEO_EXTENSIONS:
            return (
                f'<video controls preload="metadata"{layout}>'
                f'<source src="{relative_path}" type="video/mp4"></video>'
            )
        return f'<img src="{relative_path}" alt="{html.escape(original_name, quote=True)}" loading="lazy"{layout}>'

    @staticmethod
    def _normalize_tags(tags: str | list[str]) -> str:
        values = tags if isinstance(tags, list) else tags.split(",")
        result = []
        for value in values:
            clean = value.strip()
            if clean and clean not in result:
                result.append(clean)
        return ", ".join(result)

    def process_media(self, source: str, media_kind: str, stem: str | None = None) -> str:
        source_path = Path(source).expanduser().resolve()
        if not source_path.is_file():
            raise FileNotFoundError(f"Media file not found: {source_path}")
        suffix = source_path.suffix.lower()
        stem = stem or source_path.stem
        if media_kind == "image":
            if suffix not in IMAGE_EXTENSIONS:
                raise ValueError("Selected file is not a supported image.")
            with Image.open(source_path) as image:
                animated = self._is_animated(image)
                try:
                    payload = self._encode_webp(image, 1920, 84)
                except Exception:
                    if not animated:
                        raise
                    logger.exception("Animated WebP failed for %s, keeping the original file", source_path.name)
                    payload = None
            if payload is None:                    # the animation matters more than the format
                output = self._content_media_path(source_path.read_bytes(), stem, suffix)
                if not output.exists():
                    shutil.copy2(source_path, output)
            else:
                output = self._content_media_path(payload, stem, ".webp")
                if not output.exists():            # identical bytes already imported
                    output.write_bytes(payload)
        elif media_kind == "video":
            if suffix not in VIDEO_EXTENSIONS:
                raise ValueError("Selected file is not a supported video.")
            if shutil.which("ffmpeg") is None:
                raise RuntimeError("FFmpeg is required to optimize videos but was not found on PATH.")
            output = self.media_dir / f"{re.sub(r'[^a-zA-Z0-9_-]+', '-', stem).strip('-') or 'media'}-{uuid.uuid4().hex[:10]}.mp4"
            command = [
                "ffmpeg", "-y", "-i", str(source_path),
                "-vf", "scale=w=min(1920\\,iw):h=min(1080\\,ih):force_original_aspect_ratio=decrease",
                "-c:v", "libx264", "-preset", "medium", "-crf", "24",
                "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(output),
            ]
            completed = subprocess.run(command, capture_output=True, text=True, check=False)
            if completed.returncode != 0:
                output.unlink(missing_ok=True)
                detail = completed.stderr.strip().splitlines()[-1] if completed.stderr.strip() else "unknown FFmpeg error"
                raise RuntimeError(f"FFmpeg could not process the video: {detail}")
            final = self._content_media_path(output.read_bytes(), stem, ".mp4")   # same bytes, same name
            if final.exists():
                output.unlink(missing_ok=True)
            else:
                output.replace(final)
            output = final
        else:
            raise ValueError("Media kind must be image or video.")
        return output.relative_to(self.project_dir).as_posix()

    def _content_media_path(self, payload: bytes, stem: str, suffix: str) -> Path:
        """Name a media after its own bytes, so re-inserting one file reuses it.

        The previous random suffix meant every insert of the same picture left
        another copy in assets/carnet (see Bug B).
        """
        safe_stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", stem).strip("-") or "media"
        digest = hashlib.sha256(payload).hexdigest()[:10]
        return self.media_dir / f"{safe_stem}-{digest}{suffix}"

    def unused_media(self) -> list[dict[str, Any]]:
        """Return media in assets/carnet no entry refers to."""
        referenced = {match for entry in self.load() for match in re.findall(r'src="([^"]+)"', str(entry.get("body", "")))}
        orphans = []
        for media in sorted(self.media_dir.iterdir()):
            if not media.is_file():
                continue
            relative = media.relative_to(self.project_dir).as_posix()
            if relative not in referenced:
                orphans.append({"path": relative, "bytes": media.stat().st_size})
        return orphans

    def cleanup_unused_media(self) -> list[str]:
        """Delete media files that are no longer referenced by saved entries."""
        deleted: list[str] = []
        for orphan in self.unused_media():
            path = self.project_dir / orphan["path"]
            try:
                path.unlink()
            except FileNotFoundError:
                continue
            except OSError:
                logger.warning("Could not delete unused media %s", path, exc_info=True)
                continue
            deleted.append(orphan["path"])
        if deleted:
            logger.info("Deleted %d unused media file(s): %s", len(deleted), ", ".join(deleted))
        return deleted


class EditorApi:
    """Bridge exposed to the editor page.

    Every attribute must stay private: pywebview walks the public, non-callable
    attributes of this object to build ``window.pywebview.api``, and a public
    reference to the webview window would make it recurse through the whole
    WinForms object graph and touch WebView2 from a background thread.
    """

    def __init__(self, store: JournalStore, window: Any = None) -> None:
        self._store = store
        self._window = window

    def _attach(self, window: Any) -> None:
        self._window = window

    def get_entries(self) -> list[dict[str, Any]]:
        return self._store.load()

    def unused_media(self) -> list[dict[str, Any]]:
        """Media files no entry references. Reported only, never deleted."""
        try:
            return self._store.unused_media()
        except Exception:
            logger.exception("unused_media failed")
            raise

    def delete_entry(self, entry_id: str) -> dict[str, Any]:
        try:
            return self._store.delete_entry(entry_id)
        except Exception:
            logger.exception("delete_entry failed")
            raise

    def get_tag_colors(self, tags: str = "") -> dict[str, str]:
        """The saved palette, plus an unsaved default for any tag passed in.

        Lets the editor colour a tag the moment it is typed; the default is
        written to disk when the entry is saved.
        """
        colors = self._store.load_tag_colors()
        for tag in (value.strip() for value in tags.split(",")):
            if not tag:
                continue
            existing = JournalStore.match_tag(colors, tag)
            colors[tag] = colors[existing] if existing else JournalStore.default_tag_color(tag)
        return colors

    def set_tag_color(self, tag: str, color: str) -> dict[str, str]:
        try:
            return self._store.set_tag_color(tag, color)
        except Exception:
            logger.exception("set_tag_color failed")
            raise

    def save_entry(self, title: str, entry_date: str, tags: str, body: str, entry_id: str = "") -> dict[str, Any]:
        try:
            return self._store.save_entry(title, entry_date, tags, body, entry_id or None)
        except Exception:
            logger.exception("save_entry failed")
            raise

    def _ask_for_media(self, allow_multiple: bool) -> list[str]:
        from webview import FileDialog

        if self._window is None:
            raise RuntimeError("The media picker is only available in the desktop editor.")
        try:
            selected = self._window.create_file_dialog(
                FileDialog.OPEN, allow_multiple=allow_multiple, file_types=MEDIA_FILE_TYPES
            )
        except Exception:
            logger.exception("The media picker failed")
            raise
        return list(selected or [])

    def pick_media(self) -> dict[str, Any] | None:
        """Stage a single file, to swap for a media already in the entry."""
        try:
            selected = self._ask_for_media(allow_multiple=False)
            return self._store.stage_media(selected[0]) if selected else None
        except Exception:
            logger.exception("pick_media failed")
            raise

    def add_media(self) -> dict[str, Any]:
        """Stage every file picked, so a whole batch goes in at once.

        One unreadable file is reported back instead of discarding the rest of
        the selection.
        """
        staged: list[dict[str, Any]] = []
        skipped: list[str] = []
        for selected in self._ask_for_media(allow_multiple=True):
            try:
                staged.append(self._store.stage_media(selected))
            except Exception as error:
                logger.exception("stage_media failed for %s", selected)
                skipped.append(f"{Path(selected).name} ({error})")
        return {"media": staged, "skipped": skipped}


def run_editor(project_dir: Path) -> None:
    try:
        import webview
    except ImportError as exc:
        raise RuntimeError("PyWebView is required. Install dependencies from requirements.txt.") from exc

    if sys.platform == "win32":
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("GiuliaHP.Carnet")
    store = JournalStore(project_dir)
    store.cleanup_unused_media()
    api = EditorApi(store)
    html_path = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)) / "desktop_app.html"
    server = start_editor_server(project_dir, store.staging_dir, html_path)
    window = webview.create_window(
        "Giulia HP — Carnet",
        f"http://127.0.0.1:{server.server_address[1]}{EDITOR_ROUTE}",
        js_api=api,
        width=1440,
        height=920,
        min_size=(960, 640),
        maximized=True,
        text_select=True,
    )
    api._attach(window)
    try:
        window.events.closed += server.shutdown        # free the port with the window
    except Exception:
        logger.warning("Could not hook the close event; the server stops with the process")
    try:
        webview.start(debug=False)
    finally:
        server.shutdown()
        server.server_close()
        store.cleanup_staging()


def main() -> None:
    log_path = configure_logging()
    logger.info("Starting the carnet editor, log at %s", log_path)
    parser = argparse.ArgumentParser(description="Edit Giulia HP journal entries.")
    parser.add_argument("--project-dir", type=Path, default=None)
    args = parser.parse_args()
    project_dir = args.project_dir.resolve() if args.project_dir else repository_root()
    if project_dir is not None and not ((project_dir / "pages" / "index.html").exists() and (project_dir / "assets").is_dir()):
        project_dir = None
    if project_dir is None:
        project_dir = choose_project_dir()
    if project_dir is None:
        raise RuntimeError("Le dossier du site GiuliaHP.github.io est requis.")
    try:
        run_editor(project_dir)
    except Exception as error:
        show_startup_error(error)
        raise


if __name__ == "__main__":
    main()
