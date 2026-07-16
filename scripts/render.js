#!/usr/bin/env node
// Renders slide-*.html files from a folder into PNGs at the target resolution via the
// `npx playwright screenshot` CLI, then packs the result into carousel.zip. The HTML slides
// are already laid out at the target size (see templates/slide-template.html), so the
// screenshot is taken 1:1, without scaling.
//
// Usage:
//   node render.js <slides_folder> <width> <height>
// Example:
//   node render.js ./out 1080 1350

const fs = require('fs');
const path = require('path');
const { screenshotHtml, zipFiles } = require('./lib');

function main() {
  const [, , dir, widthArg, heightArg] = process.argv;
  if (!dir) {
    console.error('Usage: node render.js <slides_folder> [width=1080] [height=1350]');
    process.exit(1);
  }

  const targetWidth = parseInt(widthArg || '1080', 10);
  const targetHeight = parseInt(heightArg || '1350', 10);

  const files = fs.readdirSync(dir)
    .filter((f) => /^slide-\d+\.html$/.test(f))
    .sort();

  if (files.length === 0) {
    console.error(`No slide-NN.html files found in ${dir}`);
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
  console.log(`Done: carousel.zip (${pngPaths.length} slides)`);
}

main();
