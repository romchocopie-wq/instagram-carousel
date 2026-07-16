#!/usr/bin/env node
// Рендерит slide-*.html из папки в PNG нужного разрешения через CLI `npx playwright screenshot`
// и упаковывает результат в carousel.zip. HTML-слайды уже свёрстаны в целевом размере
// (см. templates/slide-template.html), поэтому скриншот снимается 1:1, без масштабирования.
//
// Использование:
//   node render.js <папка_со_слайдами> <ширина> <высота>
// Пример:
//   node render.js ./out 1080 1350

const fs = require('fs');
const path = require('path');
const { screenshotHtml, zipFiles } = require('./lib');

function main() {
  const [, , dir, widthArg, heightArg] = process.argv;
  if (!dir) {
    console.error('Использование: node render.js <папка_со_слайдами> [ширина=1080] [высота=1350]');
    process.exit(1);
  }

  const targetWidth = parseInt(widthArg || '1080', 10);
  const targetHeight = parseInt(heightArg || '1350', 10);

  const files = fs.readdirSync(dir)
    .filter((f) => /^slide-\d+\.html$/.test(f))
    .sort();

  if (files.length === 0) {
    console.error(`В папке ${dir} не найдено файлов slide-NN.html`);
    process.exit(1);
  }

  const pngPaths = [];

  for (const file of files) {
    const htmlPath = path.join(dir, file);
    const pngName = file.replace(/\.html$/, '.png');
    const pngPath = path.join(dir, pngName);

    screenshotHtml(htmlPath, pngPath, targetWidth, targetHeight);

    pngPaths.push(pngPath);
    console.log(`OK: ${pngName} (${targetWidth}x${targetHeight})`);
  }

  zipFiles(pngPaths, path.join(dir, 'carousel.zip'));
  console.log(`Готово: carousel.zip (${pngPaths.length} слайдов)`);
}

main();
