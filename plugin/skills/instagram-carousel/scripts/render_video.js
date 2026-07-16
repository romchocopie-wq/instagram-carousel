#!/usr/bin/env node
// Assembles a carousel video slide: trim by duration, scale+crop to the target size
// (the equivalent of CSS background-size:cover), overlay text via chroma key.
// The overlay is a PNG rendered from templates/overlay-template.html the same way render.js
// renders text/photo slides (npx playwright screenshot), just on a solid chroma-key
// background instead of transparency — the Playwright CLI screenshot has no alpha channel.
//
// Usage:
//   node render_video.js <input_video> <overlay.png> <output.mp4> [width=1080] [height=1350] [start_sec=0] [duration_sec=8] [chromaKey=0xFF00FF]

const { renderVideoSlide } = require('./lib');

function main() {
  const [, , input, overlay, output, widthArg, heightArg, startArg, durationArg, chromaArg] = process.argv;

  if (!input || !overlay || !output) {
    console.error('Usage: node render_video.js <video> <overlay.png> <output.mp4> [width=1080] [height=1350] [start=0] [duration=8] [chromaKey=0xFF00FF]');
    process.exit(1);
  }

  const width = parseInt(widthArg || '1080', 10);
  const height = parseInt(heightArg || '1350', 10);
  const start = parseFloat(startArg || '0');
  const duration = parseFloat(durationArg || '8');
  const chromaKey = chromaArg || '0xFF00FF';

  const usedDuration = renderVideoSlide({ input, overlay, output, width, height, start, duration, chromaKey });
  console.log(`Done: ${output} (${width}x${height}, ${usedDuration}s)`);
}

main();
