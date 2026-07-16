// Shared helpers for render.js / render_video.js / build_carousel.js.
// Doesn't do anything on its own — only exports functions.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// cmd.exe doesn't escape arguments itself — wrap in quotes and double internal quotes.
function quoteArg(arg) {
  return `"${String(arg).replace(/"/g, '""')}"`;
}

// Screenshots a single HTML file into a PNG at the target resolution via the
// `npx playwright screenshot` CLI.
function screenshotHtml(htmlPath, pngPath, width, height) {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const fileUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/');

  const cmd = [
    npxCmd, '--yes', 'playwright', 'screenshot',
    '--viewport-size', quoteArg(`${width},${height}`),
    quoteArg(fileUrl), quoteArg(pngPath),
  ].join(' ');
  execSync(cmd, { stdio: 'inherit' });
}

// Trim + scale/crop to the target size + overlay text via chroma key.
// Returns the actually applied duration (after clamping to the 3-60s limit).
function renderVideoSlide({ input, overlay, output, width, height, start = 0, duration = 8, chromaKey = '0xFF00FF' }) {
  if (!fs.existsSync(input)) throw new Error(`Input file not found: ${input}`);
  if (!fs.existsSync(overlay)) throw new Error(`Overlay not found: ${overlay}`);

  // Instagram's hard limit for a carousel video slide: 3-60 seconds.
  const clampedDuration = Math.min(60, Math.max(3, duration));
  if (clampedDuration !== duration) {
    console.log(`Duration adjusted to Instagram's limit (3-60s): ${duration}s -> ${clampedDuration}s`);
  }

  const filter = [
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setpts=PTS-STARTPTS[bg]`,
    `[1:v]colorkey=${chromaKey}:0.15:0.05[fg]`,
    `[bg][fg]overlay=0:0:shortest=1[out]`,
  ].join(';');

  const cmd = [
    'ffmpeg', '-y',
    '-ss', quoteArg(start), '-t', quoteArg(clampedDuration), '-i', quoteArg(input),
    '-loop', '1', '-i', quoteArg(overlay),
    '-filter_complex', quoteArg(filter),
    '-map', quoteArg('[out]'), '-map', '0:a?',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    quoteArg(output),
  ].join(' ');

  execSync(cmd, { stdio: 'inherit' });
  return clampedDuration;
}

// ffprobe: video resolution and duration.
function probeVideo(videoPath) {
  const cmd = [
    'ffprobe', '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height:format=duration',
    '-of', 'json',
    quoteArg(videoPath),
  ].join(' ');

  const output = execSync(cmd, { encoding: 'utf8' });
  const data = JSON.parse(output);
  const stream = data.streams[0];
  return {
    width: stream.width,
    height: stream.height,
    duration: parseFloat(data.format.duration),
  };
}

// A simple ZIP packer with no external npm dependencies (store method, no compression).
function zipFiles(filePaths, zipPath) {
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  for (const filePath of filePaths) {
    const name = path.basename(filePath);
    const data = fs.readFileSync(filePath);
    const crc = crc32(data);

    const localHeader = buildLocalHeader(name, data.length, crc);
    chunks.push(localHeader, data);

    centralDirectory.push(buildCentralDirEntry(name, data.length, crc, offset));
    offset += localHeader.length + data.length;
  }

  const centralDirBuffer = Buffer.concat(centralDirectory);
  const endRecord = buildEndRecord(filePaths.length, centralDirBuffer.length, offset);

  fs.writeFileSync(zipPath, Buffer.concat([...chunks, centralDirBuffer, endRecord]));

  function buildLocalHeader(name, size, crc) {
    const nameBuf = Buffer.from(name, 'utf8');
    const header = Buffer.alloc(30 + nameBuf.length);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(size, 18);
    header.writeUInt32LE(size, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);
    nameBuf.copy(header, 30);
    return header;
  }

  function buildCentralDirEntry(name, size, crc, localOffset) {
    const nameBuf = Buffer.from(name, 'utf8');
    const entry = Buffer.alloc(46 + nameBuf.length);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt16LE(0, 12);
    entry.writeUInt16LE(0, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(size, 20);
    entry.writeUInt32LE(size, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE(0, 38);
    entry.writeUInt32LE(localOffset, 42);
    nameBuf.copy(entry, 46);
    return entry;
  }

  function buildEndRecord(count, centralSize, centralOffset) {
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(count, 8);
    end.writeUInt16LE(count, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(centralOffset, 16);
    end.writeUInt16LE(0, 20);
    return end;
  }

  function crc32(buf) {
    let table = crc32.table;
    if (!table) {
      table = crc32.table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
          c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
}

module.exports = { quoteArg, screenshotHtml, renderVideoSlide, probeVideo, zipFiles };
