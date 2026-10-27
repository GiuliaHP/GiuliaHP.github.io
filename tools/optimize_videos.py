"""Batch Video Optimization Script for Giulia HP Portfolio.

Performs:
1. First-frame WebP poster extraction for every MP4.
2. Re-encoding with libx264, CRF 22, preset fast, yuv420p, +faststart.
3. Resolution capping: max width 1920, even pixel dimensions.
4. Clean AAC audio (128 kbps) if audio stream exists, or -an if none.
5. Temp file verification before in-place atomic replacement.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")


def get_video_info(path: str) -> dict:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "stream=width,height,codec_name,codec_type:format=duration,bit_rate",
        "-of",
        "json",
        path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(res.stdout)
    vstream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
    astream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)
    fmt = data.get("format", {})
    return {
        "width": int(vstream.get("width") or 0),
        "height": int(vstream.get("height") or 0),
        "duration": float(fmt.get("duration") or 0),
        "has_audio": astream is not None,
    }


def extract_poster(video_path: str, poster_path: str) -> bool:
    # Seek 0.5s or 0.1s to get a good representative frame
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        "00:00:00.300",
        "-i",
        video_path,
        "-vframes",
        "1",
        "-vf",
        "scale='min(1920,iw)':-2",
        poster_path,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        # Fallback to seeking 0.0s
        cmd[3] = "00:00:00.000"
        res = subprocess.run(cmd, capture_output=True, text=True)
    return res.returncode == 0 and os.path.exists(poster_path) and os.path.getsize(poster_path) > 0


def optimize_video(video_path: str) -> tuple[float, float, bool]:
    orig_size = os.path.getsize(video_path) / (1024 * 1024)
    info = get_video_info(video_path)
    base_no_ext, _ = os.path.splitext(video_path)
    poster_path = f"{base_no_ext}_poster.webp"
    temp_out = f"{base_no_ext}.temp_opt.mp4"

    # Extract poster
    extract_poster(video_path, poster_path)

    # Determine CRF and scale
    is_preview = "previews" in video_path.replace("\\", "/")
    max_w = 1280 if is_preview else 1920
    crf = "23" if is_preview else "22"

    vf = f"scale='min({max_w},iw)':-2"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        video_path,
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-crf",
        crf,
        "-preset",
        "fast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
    ]

    if info["has_audio"]:
        cmd.extend(["-c:a", "aac", "-b:a", "128k"])
    else:
        cmd.append("-an")

    cmd.append(temp_out)

    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0 or not os.path.exists(temp_out):
        print(f"FAILED to encode {video_path}: {res.stderr[-200:]}")
        if os.path.exists(temp_out):
            os.remove(temp_out)
        return orig_size, orig_size, False

    # Verify new file
    try:
        new_info = get_video_info(temp_out)
        if new_info["width"] == 0 or new_info["height"] == 0:
            raise ValueError("Corrupt output video")
    except Exception as e:
        print(f"Verification failed for {temp_out}: {e}")
        os.remove(temp_out)
        return orig_size, orig_size, False

    new_size = os.path.getsize(temp_out) / (1024 * 1024)

    # Only replace if new size is smaller (or if moov atom/format needed fixing)
    if new_size < orig_size:
        os.replace(temp_out, video_path)
        return orig_size, new_size, True
    else:
        # If original was already smaller, clean up temp
        os.remove(temp_out)
        return orig_size, orig_size, False


def main():
    print(f"Scanning {ASSETS_DIR} for MP4 videos...")
    videos = []
    for root, dirs, files in os.walk(ASSETS_DIR):
        for f in files:
            if f.lower().endswith(".mp4") and not f.endswith(".temp_opt.mp4"):
                videos.append(os.path.join(root, f))

    print(f"Found {len(videos)} videos.")
    total_orig = 0.0
    total_new = 0.0
    start_time = time.time()

    for idx, vpath in enumerate(videos, 1):
        rel_path = os.path.relpath(vpath, PROJECT_ROOT).replace("\\", "/")
        print(f"[{idx}/{len(videos)}] Processing {rel_path}...", end=" ", flush=True)
        t0 = time.time()
        try:
            s_orig, s_new, replaced = optimize_video(vpath)
            total_orig += s_orig
            total_new += s_new
            reduction = (1 - s_new / s_orig) * 100 if s_orig > 0 else 0
            status = f"-{reduction:.1f}% ({s_orig:.1f}MB -> {s_new:.1f}MB)" if replaced else "kept orig"
            print(f"{status} in {time.time() - t0:.1f}s")
        except Exception as e:
            print(f"ERROR: {e}")
            total_orig += os.path.getsize(vpath) / (1024 * 1024)
            total_new += os.path.getsize(vpath) / (1024 * 1024)

    elapsed = time.time() - start_time
    total_saved = total_orig - total_new
    total_reduct = (total_saved / total_orig) * 100 if total_orig > 0 else 0
    print("\n" + "=" * 60)
    print("VIDEO OPTIMIZATION COMPLETE!")
    print(f"Total time: {elapsed:.1f}s ({elapsed/60:.1f} min)")
    print(f"Original size: {total_orig:.1f} MB")
    print(f"Optimized size: {total_new:.1f} MB")
    print(f"Total saved: {total_saved:.1f} MB ({total_reduct:.1f}% reduction)")
    print("=" * 60)


if __name__ == "__main__":
    main()

