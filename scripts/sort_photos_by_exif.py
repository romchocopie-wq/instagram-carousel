#!/usr/bin/env python3
"""
Сортирует фото по времени съёмки для травел-каруселей: сначала пробует EXIF
DateTimeOriginal/DateTime, если в файле метаданных нет (частый случай для фото,
скачанных через мессенджеры — EXIF обычно вырезается при пересжатии) — откатывается
на дату изменения файла (mtime) и явно помечает это в выводе, чтобы не выдавать
недостоверный порядок за точный.

Использование:
    python sort_photos_by_exif.py <папка_с_фото> [выходной.json]

Выводит JSON-список объектов {file, timestamp, source} в порядке по времени
съёмки (source: "exif" или "mtime_fallback"), плюс печатает тот же список в stdout.
"""
import json
import os
import sys

from PIL import ExifTags, Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

DATETIME_TAGS = ["DateTimeOriginal", "DateTime"]
TAG_IDS = {name: tag_id for tag_id, name in ExifTags.TAGS.items() if name in DATETIME_TAGS}


def read_exif_datetime(path):
    try:
        with Image.open(path) as img:
            exif = img.getexif()
            if not exif:
                return None
            for tag_name in DATETIME_TAGS:
                tag_id = TAG_IDS.get(tag_name)
                if tag_id and tag_id in exif:
                    # Формат EXIF: "YYYY:MM:DD HH:MM:SS"
                    raw = exif[tag_id]
                    return raw.replace(":", "-", 2)  # -> "YYYY-MM-DD HH:MM:SS", сортируется как строка
    except Exception:
        return None
    return None


def main():
    if len(sys.argv) < 2:
        print("Использование: python sort_photos_by_exif.py <папка_с_фото> [выходной.json]")
        sys.exit(1)

    folder = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else None

    exts = {".jpg", ".jpeg", ".png", ".heic", ".webp"}
    files = [f for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in exts]

    entries = []
    for f in files:
        full = os.path.join(folder, f)
        exif_dt = read_exif_datetime(full)
        if exif_dt:
            entries.append({"file": f, "timestamp": exif_dt, "source": "exif"})
        else:
            mtime = os.path.getmtime(full)
            import datetime
            ts = datetime.datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
            entries.append({"file": f, "timestamp": ts, "source": "mtime_fallback"})

    entries.sort(key=lambda e: e["timestamp"])

    exif_count = sum(1 for e in entries if e["source"] == "exif")
    fallback_count = len(entries) - exif_count
    if fallback_count:
        print(f"Внимание: у {fallback_count} из {len(entries)} фото нет EXIF-даты съёмки — "
              f"порядок для них определён по дате изменения файла (менее надёжно).", file=sys.stderr)

    output = json.dumps(entries, ensure_ascii=False, indent=2)
    print(output)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as fp:
            fp.write(output)


if __name__ == "__main__":
    main()
