#!/usr/bin/env python3
"""
Рендерит слайды карусели через Pillow (без Node/браузера) — для песочниц
Claude.ai / Cowork, где Playwright недоступен.

Использование:
    python render_pillow.py slides.json [design-system.json] [out_dir]

slides.json — список слайдов вида:
    [
      {"headline": "Заголовок", "body": "Текст слайда", "caption": "Подпись под слайдом (необязательно)"},
      ...
    ]

caption — необязательное поле: видимая подпись под слайдом при пролистывании (Instagram
Multiple Captions), отдельно от headline/body (вшиты в картинку). Собирается в slide-captions.json.
"""
import json
import os
import sys
import zipfile

from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_font(family, size, weight):
    # В песочнице нет гарантии наличия конкретного TTF-файла Arial,
    # поэтому пробуем несколько стандартных путей и откатываемся на default.
    candidates = []
    if weight >= 600:
        candidates += ["DejaVuSans-Bold.ttf", "Arial Bold.ttf", "arialbd.ttf"]
    else:
        candidates += ["DejaVuSans.ttf", "Arial.ttf", "arial.ttf"]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        trial = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def render_slide(slide, index, total, design, target_width, target_height, out_path):
    palette = design["palette"]
    fonts = design["fonts"]
    safe = design["safeArea"]
    dots_cfg = design["progressDots"]
    arrow_cfg = design["swipeArrow"]

    img = Image.new("RGB", (target_width, target_height), palette["background"])
    draw = ImageDraw.Draw(img)

    content_left = safe["left"]
    content_right = target_width - safe["right"]
    content_width = content_right - content_left

    # Акцентная полоска
    accent_y = safe["top"]
    draw.rectangle(
        [content_left, accent_y, content_left + 56, accent_y + 6],
        fill=palette["accent"],
    )

    # Заголовок
    headline_size = fonts["headline"]["sizeCover"] if index == 0 else fonts["headline"]["sizeSlide"]
    headline_font = get_font(fonts["headline"]["family"], headline_size, fonts["headline"]["weight"])
    headline_lines = wrap_text(draw, slide["headline"], headline_font, content_width)

    body_font = get_font(fonts["body"]["family"], fonts["body"]["size"], fonts["body"]["weight"])
    body_lines = wrap_text(draw, slide.get("body", ""), body_font, content_width)

    line_gap = int(fonts["body"]["size"] * (fonts["body"]["lineHeight"] - 1))
    headline_block_height = len(headline_lines) * int(headline_size * 1.15)
    body_block_height = len(body_lines) * (fonts["body"]["size"] + line_gap)
    total_text_height = headline_block_height + 20 + body_block_height

    y = (target_height - total_text_height) // 2

    for line in headline_lines:
        draw.text((content_left, y), line, font=headline_font, fill=palette["headline"])
        y += int(headline_size * 1.15)

    y += 20
    for line in body_lines:
        draw.text((content_left, y), line, font=body_font, fill=palette["body"])
        y += fonts["body"]["size"] + line_gap

    # Индикатор слайдов
    dot_r = dots_cfg["radius"]
    dot_gap = dots_cfg["gap"]
    dots_y = target_height - dots_cfg["bottomOffset"]
    dots_x = content_left
    for i in range(total):
        color = palette["dotActive"] if i == index else palette["dotInactive"]
        draw.ellipse(
            [dots_x, dots_y - dot_r, dots_x + dot_r * 2, dots_y + dot_r],
            fill=color,
        )
        dots_x += dot_r * 2 + dot_gap

    # Стрелка "листай дальше" на всех слайдах, кроме последнего
    if index < total - 1:
        arrow_size = arrow_cfg["size"]
        ax = target_width - arrow_cfg["rightOffset"] - arrow_size
        ay = dots_y - arrow_size // 2
        arrow_font = get_font(fonts["headline"]["family"], arrow_size, 400)
        draw.text((ax, ay), "→", font=arrow_font, fill=palette["headline"])

    img.save(out_path, "PNG")


def main():
    if len(sys.argv) < 2:
        print("Использование: python render_pillow.py slides.json [design-system.json] [out_dir]")
        sys.exit(1)

    slides_path = sys.argv[1]
    design_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(__file__), "..", "templates", "design-system.json"
    )
    out_dir = sys.argv[3] if len(sys.argv) > 3 else os.path.dirname(os.path.abspath(slides_path))

    slides = load_json(slides_path)
    design = load_json(design_path)

    fmt = slides[0].get("format", "portrait") if slides and isinstance(slides[0], dict) else "portrait"
    size = design["formats"].get(fmt, design["formats"]["portrait"])
    target_width, target_height = size["width"], size["height"]

    os.makedirs(out_dir, exist_ok=True)
    png_paths = []
    captions = []
    for i, slide in enumerate(slides):
        num = f"{i + 1:02d}"
        out_path = os.path.join(out_dir, f"slide-{num}.png")
        render_slide(slide, i, len(slides), design, target_width, target_height, out_path)
        png_paths.append(out_path)
        captions.append({"slide": f"slide-{num}", "caption": slide.get("caption", "")})
        print(f"OK: slide-{num}.png ({target_width}x{target_height})")

    zip_path = os.path.join(out_dir, "carousel.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in png_paths:
            zf.write(p, os.path.basename(p))

    captions_path = os.path.join(out_dir, "slide-captions.json")
    with open(captions_path, "w", encoding="utf-8") as f:
        json.dump(captions, f, ensure_ascii=False, indent=2)

    print(f"Готово: carousel.zip ({len(png_paths)} слайдов), slide-captions.json")


if __name__ == "__main__":
    main()
