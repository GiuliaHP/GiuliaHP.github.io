"""Batch Image Optimization Script for Giulia HP Portfolio.

Converts large artwork PNGs to high-quality WebP, resizes oversized renders (max 2560px),
optimizes oversized logos/icons, and updates JSON manifests & HTML pages.
"""

from __future__ import annotations

import os
import re
from PIL import Image

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")
PAGES_DIR = os.path.join(PROJECT_ROOT, "pages")
DATA_DIR = os.path.join(ASSETS_DIR, "data")

MAX_ART_DIM = 2560
MAX_LOGO_DIM = 512
WEBP_QUALITY = 88


def optimize_artwork_png(png_path: str) -> tuple[str, float, float]:
    """Convert an artwork PNG to WebP, resize if oversized, return (webp_path, orig_mb, new_mb)."""
    orig_size = os.path.getsize(png_path) / (1024 * 1024)
    base_no_ext, _ = os.path.splitext(png_path)
    webp_path = f"{base_no_ext}.webp"

    with Image.open(png_path) as im:
        w, h = im.size
        # Check if resize needed
        max_dim = max(w, h)
        if max_dim > MAX_ART_DIM:
            scale = MAX_ART_DIM / max_dim
            new_w = int(w * scale)
            new_h = int(h * scale)
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Save as high quality WebP
        im.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=4)

    new_size = os.path.getsize(webp_path) / (1024 * 1024)
    return webp_path, orig_size, new_size


def update_references(replacements: dict[str, str]):
    """Update string references in JSON, HTML, and JS files."""
    files_to_check = []
    for root, dirs, files in os.walk(PROJECT_ROOT):
        if any(p in root for p in [".git", ".venv", "build", "dist", "__pycache__", "scratch"]):
            continue
        for f in files:
            if f.endswith((".json", ".html", ".js")):
                files_to_check.append(os.path.join(root, f))

    modified_count = 0
    for fpath in files_to_check:
        try:
            with open(fpath, "r", encoding="utf-8") as fp:
                content = fp.read()

            new_content = content
            for old_sub, new_sub in replacements.items():
                if old_sub in new_content:
                    new_content = new_content.replace(old_sub, new_sub)

            if new_content != content:
                with open(fpath, "w", encoding="utf-8") as fp:
                    fp.write(new_content)
                modified_count += 1
                rel = os.path.relpath(fpath, PROJECT_ROOT).replace("\\", "/")
                print(f"Updated references in: {rel}")
        except Exception as e:
            print(f"Failed updating {fpath}: {e}")

    print(f"Total files updated with new WebP references: {modified_count}")


def main():
    print(f"Scanning {ASSETS_DIR}/img for large PNG artwork...")
    png_targets = []
    # Target artwork folders: skills, showcase, backgrounds
    target_dirs = [
        os.path.join(ASSETS_DIR, "img", "skills"),
        os.path.join(ASSETS_DIR, "img", "showcase"),
        os.path.join(ASSETS_DIR, "img", "backgrounds"),
    ]

    for tdir in target_dirs:
        for root, dirs, files in os.walk(tdir):
            for f in files:
                if f.lower().endswith(".png"):
                    p = os.path.join(root, f)
                    # Filter out small files under 100KB unless they are in backgrounds
                    if os.path.getsize(p) > 100 * 1024 or "backgrounds" in root:
                        png_targets.append(p)

    print(f"Found {len(png_targets)} large PNG artwork files to optimize.")

    replacements = {}
    total_orig = 0.0
    total_new = 0.0

    for idx, png_path in enumerate(png_targets, 1):
        rel_png = os.path.relpath(png_path, PROJECT_ROOT).replace("\\", "/")
        fname = os.path.basename(png_path)
        base_name, _ = os.path.splitext(fname)
        webp_name = f"{base_name}.webp"

        webp_path, orig_mb, new_mb = optimize_artwork_png(png_path)
        total_orig += orig_mb
        total_new += new_mb

        reduct = (1 - new_mb / orig_mb) * 100 if orig_mb > 0 else 0
        print(f"[{idx}/{len(png_targets)}] {fname} -> {webp_name}: -{reduct:.1f}% ({orig_mb:.2f}MB -> {new_mb:.2f}MB)")

        # Record replacement for reference update
        # Replace occurrences of fname with webp_name
        replacements[fname] = webp_name

        # Delete original PNG now that WebP exists
        os.remove(png_path)

    print("\nUpdating project references across JSON and HTML files...")
    update_references(replacements)

    saved = total_orig - total_new
    pct = (saved / total_orig) * 100 if total_orig > 0 else 0
    print("\n" + "=" * 60)
    print("IMAGE OPTIMIZATION COMPLETE!")
    print(f"Original size: {total_orig:.2f} MB")
    print(f"WebP size:     {total_new:.2f} MB")
    print(f"Total saved:   {saved:.2f} MB ({pct:.1f}% reduction)")
    print("=" * 60)


if __name__ == "__main__":
    main()

