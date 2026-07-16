# Instagram Carousel

Claude Code skill для создания брендированной Instagram-карусели из текста,
фото и/или видео. Собирает контент и стиль, строит слайд-бриф с обязательным
подтверждением, затем рендерит готовые слайды — одной командой, даже если
карусель смешанная (текст + фото + видео вперемешку).

![preview](docs/preview/slide-01.png)

## Возможности

- **Формат** — 4:5 (1080×1350) или 1:1 (1080×1080), до 10 слайдов.
- **Стиль** — свой `brand-kit.md`, готовые пресеты (`light`/`vibrant`/дефолтный
  тёмный) или палитра, извлечённая из присланных референсов.
- **Два независимых рендерера**: HTML+Playwright (Claude Code, локально) и
  чистый Python+Pillow (Claude.ai/Cowork, без сети/Node.js) — скилл сам
  определяет доступную среду. Есть и режим без рендера — готовые
  Gemini/Nano Banana промпты вручную.
- **Видео-слайды** (Claude Code only) — обрезка, кроп, наложение текстового
  оверлея через ffmpeg (chroma-key), 3-60 секунд на клип.
- **Alt-текст** и **per-slide captions** (Instagram Multiple Captions) —
  отдельные текстовые слои поверх обычной общей подписи.
- **Сортировка фото по EXIF** — для тревел-каруселей, с честным откатом на
  дату изменения файла, если EXIF отсутствует (частый случай для фото из
  мессенджеров).
- **Tone-of-voice** — если в проекте есть `voice.md`/`tone-of-voice.md`,
  скилл подхватывает голос для текста слайдов и подписи; без файла — нейтральный тон.

## Зависимости

| Рендерер | Нужно | Где работает |
|---|---|---|
| `render.js` / `build_carousel.js` (HTML+Playwright) | Node.js, `npx playwright` (Chromium) | Claude Code, локально |
| `render_pillow.py` | Python 3 + Pillow | Claude.ai, Cowork, Claude Code |
| `render_video.js` | ffmpeg в PATH | Claude Code, локально |
| Gemini-режим | — (только текстовые промпты) | везде |

## Установка

### Вариант A — как обычный skill

```bash
git clone https://github.com/romchocopie-wq/instagram-carousel.git ~/.claude/skills/instagram-carousel
```

(на Windows — в `%USERPROFILE%\.claude\skills\instagram-carousel`)

### Вариант B — как плагин Claude Code

Плагин лежит в поддиректории [`plugin/`](./plugin). Локально:

```bash
git clone https://github.com/romchocopie-wq/instagram-carousel.git
claude --plugin-dir instagram-carousel/plugin
```

Либо скопируй содержимое `plugin/` в директорию, где Claude Code ищет
установленные плагины.

## Использование

В новом чате Claude Code написать что-то вроде «сделай карусель для инстаграм
про [тема]» — скилл триггернется сам и проведёт через уточняющие вопросы
(формат, стиль, число слайдов, способ рендера), затем покажет бриф на
подтверждение и только после этого сгенерирует слайды.

## Структура репозитория

```
instagram-carousel/
├── SKILL.md                     # сам skill — вариант A (простая установка)
├── scripts/
│   ├── lib.js                    # общие хелперы (скриншот HTML, ZIP, ffmpeg-композит, ffprobe)
│   ├── render.js                 # Node+Playwright рендерер (Claude Code)
│   ├── render_pillow.py          # Python+Pillow рендерер (Claude.ai/Cowork)
│   ├── render_video.js           # ffmpeg: обрезка + кроп + chroma-key оверлей видео-слайда
│   ├── build_carousel.js         # оркестратор: вся карусель одной командой по slides.json
│   └── sort_photos_by_exif.py    # сортировка фото по EXIF для тревел-каруселей
├── templates/
│   ├── slide-template.html       # текстовый слайд
│   ├── slide-photo-template.html # фото-слайд (фон-фото + градиент + текст)
│   ├── overlay-template.html     # текстовый оверлей на chroma-key фоне для видео
│   ├── design-system.json        # константы дизайна для всех рендереров
│   ├── design-presets.json       # готовые стили (light/vibrant)
│   └── brand-kit-template.md     # стартовый шаблон brand-kit.md
├── references/
│   └── design-patterns.md        # структура слайдов, лимиты платформы, паттерны
├── docs/preview/                 # примеры сгенерированных слайдов (синтетические демо-данные)
├── plugin/                       # обёртка под плагин — вариант B
│   ├── .claude-plugin/plugin.json
│   └── skills/instagram-carousel/
├── LICENSE
└── README.md
```

## Лицензия

MIT — см. [LICENSE](./LICENSE).
