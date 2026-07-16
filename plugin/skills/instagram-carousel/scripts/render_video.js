#!/usr/bin/env node
// Собирает видео-слайд карусели: обрезка по длительности, масштаб+кроп под целевой размер
// (аналог CSS background-size:cover), наложение текстового оверлея через chroma-key.
// Оверлей — это PNG, отрендеренный из templates/overlay-template.html тем же способом,
// что и render.js рендерит текстовые/фото-слайды (npx playwright screenshot), только
// на сплошном chroma-key фоне вместо прозрачности — CLI-скриншот Playwright не отдаёт альфа-канал.
//
// Использование:
//   node render_video.js <входное_видео> <overlay.png> <output.mp4> [ширина=1080] [высота=1350] [старт_сек=0] [длительность_сек=8] [chromaKey=0xFF00FF]

const { renderVideoSlide } = require('./lib');

function main() {
  const [, , input, overlay, output, widthArg, heightArg, startArg, durationArg, chromaArg] = process.argv;

  if (!input || !overlay || !output) {
    console.error('Использование: node render_video.js <видео> <overlay.png> <output.mp4> [ширина=1080] [высота=1350] [старт=0] [длительность=8] [chromaKey=0xFF00FF]');
    process.exit(1);
  }

  const width = parseInt(widthArg || '1080', 10);
  const height = parseInt(heightArg || '1350', 10);
  const start = parseFloat(startArg || '0');
  const duration = parseFloat(durationArg || '8');
  const chromaKey = chromaArg || '0xFF00FF';

  const usedDuration = renderVideoSlide({ input, overlay, output, width, height, start, duration, chromaKey });
  console.log(`Готово: ${output} (${width}x${height}, ${usedDuration}s)`);
}

main();
