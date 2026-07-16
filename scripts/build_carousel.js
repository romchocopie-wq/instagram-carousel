#!/usr/bin/env node
// Оркестратор: собирает всю карусель (текст/фото/видео вперемешку) одной командой
// по манифесту slides.json, вместо ручного вызова render.js/render_video.js на каждый слайд.
//
// Использование:
//   node build_carousel.js <slides.json> <outDir> [design-system.json]
//
// Формат slides.json:
// {
//   "format": "portrait" | "square",
//   "slides": [
//     { "type": "text",  "headline": "...", "body": "...", "altText": "...", "caption": "..." },
//     { "type": "photo", "source": "C:\\...\\photo.jpg", "headline": "...", "body": "...", "altText": "...", "caption": "..." },
//     { "type": "video", "source": "C:\\...\\clip.mp4", "start": null, "duration": 8, "headline": "...", "body": "...", "altText": "...", "caption": "..." }
//   ]
// }
// Для видео start: null (или поле пропущено) -> берётся середина клипа через ffprobe-автодетект
// длительности исходника, а не всегда 0-я секунда.
// caption — необязательное поле: видимая подпись под слайдом при пролистывании (Instagram
// Multiple Captions), отдельно от headline/body (вшиты в картинку) и altText (только для
// доступности). Собирается в slide-captions.json рядом с alt-text.json.

const fs = require('fs');
const path = require('path');
const { screenshotHtml, renderVideoSlide, probeVideo, zipFiles } = require('./lib');

const skillDir = path.join(__dirname, '..');

function fillTemplate(template, values) {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, String(value));
  }
  return result;
}

function buildDots(total, activeIndex) {
  return Array.from({ length: total }, (_, j) =>
    `<span class="${j === activeIndex ? 'active' : ''}"></span>`
  ).join('');
}

function buildArrow(isLast) {
  return isLast ? '' : '<div class="swipe-arrow">&#8594;</div>';
}

// Плейсхолдеры, общие для всех трёх шаблонов (текст/фото/видео-оверлей).
function commonValues(design, headline, body, headlineSize, dotsHtml, arrowHtml) {
  return {
    COLOR_HEADLINE: design.palette.headline,
    COLOR_BODY: design.palette.body,
    COLOR_DOT_ACTIVE: design.palette.dotActive,
    COLOR_DOT_INACTIVE: design.palette.dotInactive,
    FONT_FAMILY: design.fonts.headline.family,
    HEADLINE_WEIGHT: design.fonts.headline.weight,
    HEADLINE_SIZE: headlineSize,
    BODY_WEIGHT: design.fonts.body.weight,
    BODY_SIZE: design.fonts.body.size,
    BODY_LINE_HEIGHT: design.fonts.body.lineHeight,
    DOTS_BOTTOM: design.progressDots.bottomOffset,
    DOTS_GAP: design.progressDots.gap,
    DOT_SIZE: design.progressDots.radius * 2,
    ARROW_RIGHT: design.swipeArrow.rightOffset,
    ARROW_SIZE: design.swipeArrow.size,
    HEADLINE: headline || '',
    BODY: body || '',
    DOTS_HTML: dotsHtml,
    SWIPE_ARROW_HTML: arrowHtml,
  };
}

function main() {
  const [, , manifestPath, outDir, designPathArg] = process.argv;
  if (!manifestPath || !outDir) {
    console.error('Использование: node build_carousel.js <slides.json> <outDir> [design-system.json]');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const designPath = designPathArg || path.join(skillDir, 'templates', 'design-system.json');
  const design = JSON.parse(fs.readFileSync(designPath, 'utf8'));

  const formatName = manifest.format || 'portrait';
  const format = design.formats[formatName];
  if (!format) throw new Error(`Неизвестный формат: ${formatName}`);
  const { width, height } = format;

  const slides = manifest.slides;
  if (!slides || slides.length === 0) throw new Error('slides.json: пустой список слайдов');
  if (slides.length > 10) throw new Error(`slides.json: ${slides.length} слайдов, лимит Instagram — 10`);

  const textTemplate = fs.readFileSync(path.join(skillDir, 'templates', 'slide-template.html'), 'utf8');
  const photoTemplate = fs.readFileSync(path.join(skillDir, 'templates', 'slide-photo-template.html'), 'utf8');
  const overlayTemplate = fs.readFileSync(path.join(skillDir, 'templates', 'overlay-template.html'), 'utf8');

  fs.mkdirSync(outDir, { recursive: true });

  const outputFiles = [];
  const altTexts = [];
  const captions = [];

  slides.forEach((slide, i) => {
    const num = String(i + 1).padStart(2, '0');
    const isCover = i === 0;
    const isLast = i === slides.length - 1;
    const headlineSize = isCover ? design.fonts.headline.sizeCover : design.fonts.headline.sizeSlide;
    const dotsHtml = buildDots(slides.length, i);
    const arrowHtml = buildArrow(isLast);
    const common = commonValues(design, slide.headline, slide.body, headlineSize, dotsHtml, arrowHtml);

    altTexts.push({ slide: `slide-${num}`, altText: slide.altText || '' });
    captions.push({ slide: `slide-${num}`, caption: slide.caption || '' });

    if (slide.type === 'text') {
      const html = fillTemplate(textTemplate, {
        ...common,
        WIDTH: width,
        HEIGHT: height,
        COLOR_BG: design.palette.background,
        COLOR_ACCENT: design.palette.accent,
        SAFE_TOP: design.safeArea.top,
        SAFE_RIGHT: design.safeArea.right,
        SAFE_BOTTOM: design.safeArea.bottom,
        SAFE_LEFT: design.safeArea.left,
      });
      const htmlPath = path.join(outDir, `slide-${num}.html`);
      const pngPath = path.join(outDir, `slide-${num}.png`);
      fs.writeFileSync(htmlPath, html);
      screenshotHtml(htmlPath, pngPath, width, height);
      outputFiles.push(pngPath);
      console.log(`OK: slide-${num}.png (текст, ${width}x${height})`);

    } else if (slide.type === 'photo') {
      if (!fs.existsSync(slide.source)) throw new Error(`Не найдено фото: ${slide.source}`);
      const photoUrl = 'file:///' + path.resolve(slide.source).replace(/\\/g, '/');
      const textBottom = design.progressDots.bottomOffset + design.progressDots.radius * 2 + 32;
      const html = fillTemplate(photoTemplate, {
        ...common,
        WIDTH: width,
        HEIGHT: height,
        PHOTO_URL: photoUrl,
        GRADIENT_START: design.photoOverlay.gradientStartPercent,
        GRADIENT_COLOR: design.photoOverlay.gradientColor,
        SAFE_LEFT: design.safeArea.left,
        SAFE_RIGHT: design.safeArea.right,
        TEXT_BOTTOM: textBottom,
      });
      const htmlPath = path.join(outDir, `slide-${num}.html`);
      const pngPath = path.join(outDir, `slide-${num}.png`);
      fs.writeFileSync(htmlPath, html);
      screenshotHtml(htmlPath, pngPath, width, height);
      outputFiles.push(pngPath);
      console.log(`OK: slide-${num}.png (фото, ${width}x${height})`);

    } else if (slide.type === 'video') {
      if (!fs.existsSync(slide.source)) throw new Error(`Не найдено видео: ${slide.source}`);

      const duration = slide.duration || design.video.defaultDurationSeconds;
      let start = slide.start;
      if (start === null || start === undefined) {
        const info = probeVideo(slide.source);
        start = Math.max(0, (info.duration - duration) / 2);
        console.log(`Слайд ${num}: старт не задан, беру середину клипа (${info.duration.toFixed(1)}s) -> старт ${start.toFixed(1)}s`);
      }

      const textBottom = design.progressDots.bottomOffset + design.progressDots.radius * 2 + 32;
      const overlayHtml = fillTemplate(overlayTemplate, {
        ...common,
        WIDTH: width,
        HEIGHT: height,
        CHROMA_KEY: design.video.chromaKey.replace('0x', '#'),
        GRADIENT_START: design.photoOverlay.gradientStartPercent,
        GRADIENT_COLOR: design.photoOverlay.gradientColor,
        SAFE_LEFT: design.safeArea.left,
        SAFE_RIGHT: design.safeArea.right,
        TEXT_BOTTOM: textBottom,
      });
      const overlayHtmlPath = path.join(outDir, `overlay-${num}.html`);
      const overlayPngPath = path.join(outDir, `overlay-${num}.png`);
      fs.writeFileSync(overlayHtmlPath, overlayHtml);
      screenshotHtml(overlayHtmlPath, overlayPngPath, width, height);

      const mp4Path = path.join(outDir, `slide-${num}.mp4`);
      const usedDuration = renderVideoSlide({
        input: slide.source, overlay: overlayPngPath, output: mp4Path,
        width, height, start, duration, chromaKey: design.video.chromaKey,
      });
      outputFiles.push(mp4Path);
      console.log(`OK: slide-${num}.mp4 (видео, ${width}x${height}, старт ${start.toFixed(1)}s, ${usedDuration}s)`);

    } else {
      throw new Error(`Слайд ${num}: неизвестный тип "${slide.type}" (ожидался text/photo/video)`);
    }
  });

  zipFiles(outputFiles, path.join(outDir, 'carousel.zip'));

  const altTextPath = path.join(outDir, 'alt-text.json');
  fs.writeFileSync(altTextPath, JSON.stringify(altTexts, null, 2), 'utf8');

  const captionsPath = path.join(outDir, 'slide-captions.json');
  fs.writeFileSync(captionsPath, JSON.stringify(captions, null, 2), 'utf8');

  console.log(`Готово: carousel.zip (${outputFiles.length} слайдов), alt-text.json, slide-captions.json`);
}

main();
