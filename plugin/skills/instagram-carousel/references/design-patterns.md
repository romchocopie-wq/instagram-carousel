*[Русская версия](design-patterns.ru.md) — a synced Russian translation is also available.*

# Instagram Carousel Patterns

Source: a breakdown of an Instagram Reel tutorial (@miroslava_dmitrieva, 6 prompts for generating HTML carousels).

## Slide structure

- **Slide 1 — cover / hook.** A large headline, an attention-grabbing question, or a promise. Its only job is to get the viewer to swipe further.
- **Slides 2…N-1 — value.** One idea per slide, ≤25 words of text. Value builds gradually — from the basic to the insightful.
- **Last slide — CTA.** A call to follow/save/comment. Visually distinct (an accent background or contrast) so that "saving" reads as the obvious next step.

## Platform limits

- Maximum **10 slides** per Instagram carousel.
- Recommended slide counts: 6, 8, or 10 — an even number makes balancing hook/value/CTA easier.
- Formats: **1:1 (1080×1080)** or **4:5 (1080×1350)**. 4:5 takes up more feed space — the preferred default.
- Video slide: **3-60 seconds** per clip, MP4/MOV (H.264 + AAC), the same aspect ratio as the rest of the slides. In-feed video plays muted by default and loops while the slide is in view. Photos and video can be freely mixed in one carousel (total elements ≤10).

## Swipe affordances

- A progress indicator (dots) at the bottom of the slide — shows how many slides are left.
- A "swipe for more" arrow in the bottom-right corner on every slide except the last.
- Safe-area padding at the top/bottom — so text doesn't get covered by Instagram's interface icons while viewing.

## Extracting a design system from references

If the user sends 2-3 carousels/slides they like, instead of inventing a style from scratch:

1. Determine a shared hex palette (background, text, accent).
2. Determine the font pairing and the weight for headlines/body text.
3. Determine the spacing and composition character (centered / left-aligned / dense or airy).
4. Lock these parameters in as `design-system.json` values for that specific project — reuse them across every subsequent carousel for that client/brand.

## Ready-made presets and style reuse

- `templates/design-presets.json` contains 2 ready-made alternatives to the default dark style: `light` (cream background, Georgia, terracotta accent — an editorial/paper look) and `vibrant` (deep purple background, bold Arial, bright pink accent — a high-contrast/youthful look). A preset only overrides `palette` and `fonts.*.family/weight` — sizes/spacing/dots/arrow always come from `design-system.json`.
- `templates/brand-kit-template.md` — a starter file for a recurring client/brand: fill it in once with real hex codes/fonts and save it as `brand-kit.md` in the project, and the skill will read it automatically afterward without re-asking about style.

## Photo order for travel carousels

Real photos, especially ones downloaded through messaging apps, often arrive without EXIF (metadata gets stripped during recompression) — `scripts/sort_photos_by_exif.py` tries the EXIF `DateTimeOriginal` field, and falls back to the file's modification date with an explicit marker in the output when it's absent. Don't treat mtime-based order as reliable without warning the user — it's only an approximation of the real shooting chronology.

## Voice (tone-of-voice)

Separately from visual style (brand-kit.md/presets), a voice can be plugged in — how exactly to write the text. The skill looks for `voice.md`, then `tone-of-voice.md` in the project root, or reads a source the user explicitly named (a file or another skill) — without hardcoding any specific channel/brand, because a single user can have several different voices for different projects (verified on two real but mutually independent voices: one is a warm, hands-on guide with emoji list markers and a CTA into a bot; the other uses lists of allowed/banned words, an emoji table, hashtags at the start of the post, and a mandatory closing question. They partially contradict each other — which is exactly why the source isn't hardcoded into the skill and is instead determined per project).

A voice designed for a full post (usually 1000+ characters) physically doesn't fit within a carousel slide's limits (headline ≤8 words, text ≤25 words). Division of responsibility:
- **On the slides** — only vocabulary, register of address, and characteristic turns of phrase from the reference. The full post structure (opener/closer/hashtags/order) doesn't carry over to a slide.
- **In the post caption** (no length limit) — the voice is applied more fully, including structural conventions, because the caption format is closer to a regular post, which is what the voice reference was written for in the first place.

When the voice conflicts with the carousel's hard limits, the carousel's limits always win.

## Alt text

Every slide in an Instagram carousel can have a separate alt description (accessibility, a bit of SEO) — this isn't the same thing as the headline/body on the slide itself or the post caption. `build_carousel.js`/`render_pillow.py` collect alt text from the manifest's `altText` field into `alt-text.json` alongside the finished slides.

## Per-slide captions (Instagram Multiple Captions)

Since June 2026 (rolled out June 18-19, source: a breakdown by `@lena.mozg`, independently confirmed by Engadget/Digital Trends/Fast Company and others), Instagram lets users switch the caption mode when publishing a carousel: one caption for the whole post (as before) OR a separate caption on each slide (up to 20 slides), shown at the bottom of the screen while swiping — so context isn't lost while swiping. The mode is chosen by the user in the Instagram interface at publish time, not in the skill.

This is a third, separate text layer — not the same thing as the headline/body (baked into the image, a hard word limit) and not the same thing as altText (invisible, accessibility only). `build_carousel.js`/`render_pillow.py` collect the caption from the manifest's `caption` field into `slide-captions.json`, always generated alongside the regular unified post caption (Step 4), not instead of it — the user decides at publish time which of the two ready options to use.

## Reviving an underperforming carousel

If a carousel has already been published but didn't perform well:
- Strengthen the hook on the first slide (make it more specific/provocative).
- Remove the weakest-value slide.
- Rewrite the CTA so that "saving" feels like the obvious action, not a request.
