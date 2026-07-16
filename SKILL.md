---
name: instagram-carousel
description: >
  Creates a branded Instagram carousel from text, photos, and/or video — mixed carousels are
  assembled with a single command from a slides.json manifest. Gathers content and style
  (presets, brand-kit.md, or custom hex codes), builds a slide brief that requires explicit
  confirmation, then renders finished PNG/MP4 slides (HTML+Playwright in Claude Code, Pillow in
  Claude.ai/Cowork, video via ffmpeg) or hands out Gemini prompts manually. 1080x1350 or
  1080x1080 format, up to 10 slides, video 3-60 seconds, hook -> value -> CTA, a progress
  indicator, alt text, per-slide captions (Instagram Multiple Captions). Sorts photos by EXIF
  for travel carousels, generates the caption and hashtags.
  Use when the user asks for an "Instagram carousel", "instagram carousel", "IG carousel", or a
  multi-slide Instagram post with photos/video.
---

*[Русская версия](SKILL.ru.md) — this skill also ships with a Russian translation, kept
in sync; use whichever fits your working language.*

# Instagram Carousel

## CRITICAL: auto-start on activation

Once the skill triggers, go straight to step 1 — don't recap this file.

## Step 1. Gather input

Ask:

> Paste the content for the carousel (a post, bullet points, notes) or describe the topic so I can write the text from scratch. If you have 2-3 carousels/slides whose design you like, send them — I'll extract a design system (palette, fonts, spacing) from them and use it. If you have your own photos or video (e.g. for a trip-recap carousel), send them — I'll write text to match each photo/clip and build a carousel with media in the background.

If the user gave a folder with several photos and the order isn't obvious (a travel carousel, a report) — offer to sort them by shooting time:
```bash
python <path_to_skill>/scripts/sort_photos_by_exif.py <photo_folder>
```
The script reads the EXIF `DateTimeOriginal` via Pillow; if some photos lack EXIF (common for photos downloaded through messaging apps — metadata is usually stripped), it falls back to the file's modification date and marks this explicitly in the output (`"source": "mtime_fallback"`) — warn the user that the order for such photos is less reliable, instead of silently presenting it as exact.

Wait for the answer, then call AskUserQuestion:

```json
[
  {
    "question": "Carousel format?",
    "header": "Format",
    "multiSelect": false,
    "options": [
      {"label": "4:5 (1080x1350)", "description": "Portrait, takes up more feed space — recommended"},
      {"label": "1:1 (1080x1080)", "description": "Square, the classic format"}
    ]
  },
  {
    "question": "Brand style?",
    "header": "Style",
    "multiSelect": false,
    "options": [
      {"label": "Take from brand-kit.md", "description": "Use the project's brand file colors and fonts, if one exists"},
      {"label": "Ready-made preset", "description": "Default dark, light (bright/paper-like), or vibrant (bold, high-contrast) — see templates/design-presets.json"},
      {"label": "I'll set the colors myself", "description": "I'll send hex codes and font preferences"},
      {"label": "Extract from the references I sent", "description": "Only if design examples were sent — pull the palette/font from them"},
      {"label": "Pick it for me", "description": "Choose a palette and typography that fits the content"}
    ]
  },
  {
    "question": "Number of slides?",
    "header": "Slides",
    "multiSelect": false,
    "options": [
      {"label": "6 slides", "description": "Short, fast format"},
      {"label": "8 slides", "description": "Standard carousel length"},
      {"label": "10 slides", "description": "Instagram's maximum — an in-depth breakdown"}
    ]
  },
  {
    "question": "How should slides be generated?",
    "header": "Render",
    "multiSelect": false,
    "options": [
      {"label": "Automatic render (recommended)", "description": "Finished PNGs right away — HTML+Playwright in Claude Code or Pillow in Claude.ai/Cowork"},
      {"label": "Gemini prompts by hand", "description": "I'll hand out text prompts, you paste them into a chat with Gemini/Nano Banana yourself"}
    ]
  }
]
```

See `references/design-patterns.md` for slide structure, platform limits, and the technique for extracting a design system from references.

If a preset is chosen — take the palette and `fonts.headline`/`fonts.body` (family+weight) from `templates/design-presets.json[preset_name]` and use them to override the matching fields in `design-system.json` (sizes/lineHeight/spacing/dots/arrow always stay from `design-system.json` — a preset only overrides color and font).

If the project doesn't have a `brand-kit.md` yet and the user is likely to make several carousels for the same brand — offer to generate a starter file from `templates/brand-kit-template.md` once, filling in real values instead of the examples, and save it as `brand-kit.md` in the project root — then the next run of the skill will pick up the style automatically.

### Voice (tone-of-voice)

`brand-kit.md` above is about visual style. Separately, check for a voice reference — a source describing exactly how to write the text:

1. `voice.md` in the project root;
2. if it's absent — `tone-of-voice.md` in the project root;
3. if the user explicitly names a voice source in conversation (e.g. "in the voice from tone-of-voice", "like in [some reference]", or points to a specific file/skill) — read that one specifically, even if it isn't in the project root.

If nothing is found or named — silently continue with a neutral tone, don't ask a separate question about it (voice isn't a required part of the flow, unlike format/style/slide count).

If a reference is found — read it in full and use it in Step 2 and Step 4, as described there. This isn't about palette/fonts (that's `brand-kit.md`/presets) — only about which words and tone to write with.

## Step 2. Design brief

Build the slide brief following the hook -> value -> CTA structure:

- **Slide 1 (cover)**: hook, a large headline, no long text
- **Slides 2..N-1 (value)**: one idea per slide, ≤25 words of text
- **Slide N (CTA)**: a call to follow/save, visually distinct

For each slide, specify the number, headline (≤8 words), body text (≤25 words), a short alt text (a description of the slide's content for accessibility — not the same thing as the headline/body), and a caption — the visible caption shown under the slide while swiping (see "Per-slide captions" in Step 4). These three text layers are distinct: headline/body are baked into the image and tightly word-limited, altText is invisible (screen readers only), caption is visible while swiping and isn't bound by the image's word limit — but it's still about that specific slide's content, not a mini version of the overall post caption.

If the text is being written from scratch (the user didn't paste their own content) and a voice reference was found (see Step 1) — use its vocabulary (characteristic words/phrases, banned words and turns of phrase), its register of address to the reader, and its recognizable rhetorical devices. Don't try to cram the reference's whole-post structure (an opening hook, a closing question, paragraph order, hashtag placement) into a slide's headline/text — there's physically no room for that in ≤8/≤25 words, and it isn't needed: the full structure applies to the caption (Step 4). If the user pasted their own finished content — just adapt its text to the slide limits, without rewriting it into the voice.

Tell the user:

> Here's the slide brief. Tell me what to adjust, or say "generate" if it looks good.

Wait for explicit confirmation. Don't move on without it.

## Step 3. Render

### If Gemini mode was chosen

As in `gemini-carousel`: one prompt per slide in its own code block, with the same brand constraints (palette, font, style) across all prompts for consistency. At the end, offer the option of "one combined prompt for the whole carousel".

### If automatic render was chosen

First determine the runtime environment:

```bash
node -v && npx --yes playwright --version
```

**Node and Playwright available (typically Claude Code)** — the `build_carousel.js` path, one command for the whole carousel, including mixed text/photo/video:

1. Build the `slides.json` manifest:
   ```json
   {
     "format": "portrait",
     "slides": [
       { "type": "text",  "headline": "...", "body": "...", "altText": "...", "caption": "..." },
       { "type": "photo", "source": "C:\\...\\photo.jpg", "headline": "...", "body": "...", "altText": "...", "caption": "..." },
       { "type": "video", "source": "C:\\...\\clip.mp4", "duration": 8, "headline": "...", "body": "...", "altText": "...", "caption": "..." }
     ]
   }
   ```
   `format`: `"portrait"` (1080x1350) or `"square"` (1080x1080). For `video`, the `start` field can be omitted entirely — the script will then use ffprobe to detect the source's duration and take the middle of the clip instead of always second 0; `duration` without an explicit value comes from `design-system.json.video.defaultDurationSeconds` (8s) and is always clamped to 3-60s regardless.
   If the user gave their own hex codes, a design system extracted from references, or picked a preset — apply them to a copy of `design-system.json` (or pass the merged file as the third argument in step 2) without touching the skill's original.
2. Run:
   ```bash
   node <path_to_skill>/scripts/build_carousel.js slides.json ./carousel-output [design-system.json]
   ```
3. The script parses each slide's type itself, renders it the right way (text/photo via a Playwright screenshot, video via ffprobe auto-detection + chroma-key overlay + ffmpeg), and drops `slide-01.(png|mp4) ... slide-N.(png|mp4)`, `carousel.zip` (PNG and MP4 mixed together by number), `alt-text.json` (alt text for every slide, from the manifest's `altText` field), and `slide-captions.json` (the visible under-slide captions, from the `caption` field; an empty string if a slide has none) into `./carousel-output/`. The first time video is used, a one-time browser install may be needed: `npx playwright install chromium`.

The lower-level scripts `render.js` (text/photo only), `render_video.js` (a single video slide), and `lib.js` (shared helpers) remain available directly — use them instead of `build_carousel.js` only when you need to re-render one specific slide without rebuilding the whole carousel.

**Node/Playwright unavailable (Claude.ai / Cowork, a sandbox with no network)** — the `render_pillow.py` path:

1. Build `slides.json` — an array of objects `{"headline": "...", "body": "...", "altText": "...", "caption": "...", "format": "portrait"|"square"}` (format is the same for all slides, portrait = 4:5, square = 1:1). Video isn't supported here (see the rule below).
2. Run:
   ```bash
   python <path_to_skill>/scripts/render_pillow.py slides.json <path_to_skill>/templates/design-system.json ./carousel-output
   ```
3. The script draws the same slides directly via Pillow (no HTML/browser) using the same design-system constants, producing `slide-01.png ... slide-N.png` + `carousel.zip` + `slide-captions.json` (from the `caption` field, an empty string if not set).

If neither `node` nor `python` runs — tell the user and offer Gemini mode as a fallback.

### Video slide — details (works only in Claude Code via `build_carousel.js`, requires ffmpeg)

Video slides aren't rendered from scratch — an existing clip from the user is trimmed and gets the same text overlay as photo slides, via chroma key (`templates/overlay-template.html` on a solid `design-system.json.video.chromaKey` background, then `colorkey` in ffmpeg — the Playwright CLI screenshot doesn't produce an alpha channel directly). Not applicable in Claude.ai/Cowork (no access to the user's local video files there, and generally no ffmpeg). `build_carousel.js` handles all of this from the manifest automatically; the manual step-by-step call below is only needed to rebuild a single video slide in isolation:

1. Check the source's duration and resolution: `ffprobe -v error -show_entries stream=width,height,duration -of default=noprint_wrappers=1 <video>` (inside `build_carousel.js` this is done by `lib.probeVideo`).
2. If not already set, ask the user for the clip's start second and duration — 3 to 60 seconds (Instagram's hard limit for a carousel video slide).
3. Fill in `templates/overlay-template.html` with the same placeholders as `slide-photo-template.html` (headline/body/dots/arrow), but without `{{PHOTO_URL}}` — replaced with `{{CHROMA_KEY}}` = `design-system.json.video.chromaKey` in `#RRGGBB` format (e.g. `0xFF00FF` → `#FF00FF`). Save as `overlay-NN.html`.
4. Render the overlay to PNG the same way as regular slides:
   ```bash
   npx playwright screenshot --viewport-size "<width>,<height>" file:///<path>/overlay-NN.html overlay-NN.png
   ```
5. Assemble the video slide:
   ```bash
   node <path_to_skill>/scripts/render_video.js <source_video> overlay-NN.png slide-NN.mp4 <width> <height> <start_sec> <duration_sec>
   ```
   The script trims the clip by time, scales+crops it to the target size (the equivalent of `background-size: cover`), overlays the chroma-keyed PNG (`colorkey` in ffmpeg), and encodes to H.264/AAC with `+faststart`. Duration is automatically clamped to the 3-60s range if a different value is passed in.

For a mixed carousel (some slides photo/text, some video), the final files are named by a shared sequence — `slide-01.png`, `slide-02.mp4`, ... — the order in the filename determines the order in the carousel. `build_carousel.js` packs PNG and MP4 into one `carousel.zip` itself; when rebuilding manually via `render.js`/`render_video.js` one at a time, assemble the zip yourself as the last step.

## Step 4. Caption and hashtags

Separately from the slides, generate the post caption text (a short hook + an expansion of the idea + a CTA at the end) and 5-10 relevant hashtags. This is delivered in addition to the slides — it isn't baked into the images. `alt-text.json`, produced by `build_carousel.js`/`render_pillow.py`, is a different thing: an alt description for each slide (accessibility), not the post caption.

### Per-slide captions (Instagram Multiple Captions)

Since June 2026, Instagram lets users switch the caption mode when publishing a carousel: **one caption for the whole post** (as above) OR **a separate caption on each slide** (up to 20 slides, shown at the bottom of the screen while swiping). That's the user's choice in the Instagram interface at publish time, not in the skill — so always prepare **both options**: the regular unified caption (as described above) and a `caption` on every slide in the brief (Step 2), which is collected automatically into `slide-captions.json`. A per-slide caption isn't a mini version of the overall caption and isn't a duplicate of the headline/body baked into the image — it's separate text about that specific slide's content, with no 25-word limit.

If a voice reference was found (Step 1) — apply it to the caption **more fully than to the slides**, always (even if the slides themselves were built from content the user pasted, rather than written from scratch): the type of opening hook, the reference's characteristic/required closing element (e.g. a question to the audience), hashtag placement and formatting, the emoji usage pattern, recognizable rhetorical devices from the reference — there's no 25-word limit here, and the caption format is closer to a regular post, which is what the reference was written for in the first place.

## Rules

- Maximum 10 slides — the platform's hard limit.
- Video slide: 3-60 seconds, MP4/H.264+AAC, the same aspect ratio as the rest of the carousel's slides. Video mode is unavailable in Claude.ai/Cowork.
- Every slide has alt text (for accessibility) separate from the headline/body, and a caption (the visible under-slide caption while swiping, Instagram Multiple Captions) separate from both the alt text and the overall post caption — three distinct text layers; don't confuse or duplicate them.
- Always wait for brief confirmation before rendering or generating prompts.
- The cover and the CTA slide are visually distinct from the value slides.
- The palette and font are the same across every slide in the carousel.
- No em dashes.
- If the project has a `brand-kit.md` — use its hex codes and typography. If the file doesn't exist and more than one carousel is planned for this brand — offer to create it from `templates/brand-kit-template.md`.
- If a voice reference is found (`voice.md`/`tone-of-voice.md`/explicitly named) and it conflicts with the carousel's hard limits (10 slides, ≤8/≤25 words per slide, no em dashes) — the carousel's limits always win. The voice doesn't grant permission to break them.
