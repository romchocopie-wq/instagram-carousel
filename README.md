*[Русская версия](README.ru.md) — a synced Russian translation is also available.*

# Instagram Carousel

A Claude Code skill for creating a branded Instagram carousel from text,
photos, and/or video. Gathers content and style, builds a slide brief that
requires explicit confirmation, then renders the finished slides — with a
single command, even for a mixed carousel (text + photo + video combined).

![preview](docs/preview/slide-01.png)

## Features

- **Format** — 4:5 (1080×1350) or 1:1 (1080×1080), up to 10 slides.
- **Style** — your own `brand-kit.md`, ready-made presets (`light`/`vibrant`/
  default dark), or a palette extracted from references you send.
- **Two independent renderers**: HTML+Playwright (Claude Code, local) and
  pure Python+Pillow (Claude.ai/Cowork, no network/Node.js) — the skill
  detects the available environment itself. There's also a no-render mode —
  ready-made Gemini/Nano Banana prompts by hand.
- **Video slides** (Claude Code only) — trim, crop, text overlay via ffmpeg
  (chroma key), 3-60 seconds per clip.
- **Alt text** and **per-slide captions** (Instagram Multiple Captions) —
  separate text layers on top of the regular unified caption.
- **Photo sorting by EXIF** — for travel carousels, with an honest fallback
  to file modification date when EXIF is missing (common for photos from
  messaging apps).
- **Tone-of-voice** — if the project has a `voice.md`/`tone-of-voice.md`,
  the skill picks up the voice for slide text and the caption; without one,
  it defaults to a neutral tone.

## Dependencies

| Renderer | Requires | Where it works |
|---|---|---|
| `render.js` / `build_carousel.js` (HTML+Playwright) | Node.js, `npx playwright` (Chromium) | Claude Code, local |
| `render_pillow.py` | Python 3 + Pillow | Claude.ai, Cowork, Claude Code |
| `render_video.js` | ffmpeg on PATH | Claude Code, local |
| Gemini mode | — (text prompts only) | anywhere |

## Installation

### Option A — as a regular skill

```bash
git clone https://github.com/romchocopie-wq/instagram-carousel.git ~/.claude/skills/instagram-carousel
```

(on Windows — into `%USERPROFILE%\.claude\skills\instagram-carousel`)

### Option B — as a Claude Code plugin

The plugin lives in the [`plugin/`](./plugin) subdirectory. Locally:

```bash
git clone https://github.com/romchocopie-wq/instagram-carousel.git
claude --plugin-dir instagram-carousel/plugin
```

Or copy the contents of `plugin/` into wherever Claude Code looks for
installed plugins.

## Usage

In a new Claude Code chat, write something like "make an Instagram carousel
about [topic]" — the skill triggers itself and walks through clarifying
questions (format, style, slide count, render method), then shows the brief
for confirmation, and only then generates the slides.

## Repository structure

```
instagram-carousel/
├── SKILL.md                      # the skill itself, English (primary) — option A
├── SKILL.ru.md                    # the same skill, Russian translation
├── scripts/
│   ├── lib.js                     # shared helpers (HTML screenshot, ZIP, ffmpeg compositing, ffprobe)
│   ├── render.js                  # Node+Playwright renderer (Claude Code)
│   ├── render_pillow.py           # Python+Pillow renderer (Claude.ai/Cowork)
│   ├── render_video.js            # ffmpeg: trim + crop + chroma-key overlay for a video slide
│   ├── build_carousel.js          # orchestrator: the whole carousel in one command from slides.json
│   └── sort_photos_by_exif.py     # sorts photos by EXIF for travel carousels
├── templates/
│   ├── slide-template.html        # text slide
│   ├── slide-photo-template.html  # photo slide (background photo + gradient + text)
│   ├── overlay-template.html      # text overlay on a chroma-key background for video
│   ├── design-system.json         # design constants shared by all renderers
│   ├── design-presets.json        # ready-made styles (light/vibrant)
│   └── brand-kit-template.md      # brand-kit.md starter template
├── references/
│   ├── design-patterns.md         # slide structure, platform limits, patterns (EN, primary)
│   └── design-patterns.ru.md       # the same file, Russian translation
├── docs/preview/                  # sample generated slides (synthetic demo data)
├── plugin/                        # plugin wrapper — option B
│   ├── .claude-plugin/plugin.json
│   └── skills/instagram-carousel/
├── LICENSE
├── README.md                      # English (primary)
└── README.ru.md                    # this file's Russian counterpart
```

## License

MIT — see [LICENSE](./LICENSE).
