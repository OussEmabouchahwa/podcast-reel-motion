# podcast-reel-motion

**Podcast clip → vertical 1080×1920 reel for Instagram & TikTok.**
three.js draws the backgrounds and footage, framer-motion animates the Arabic typography, and headless Chrome renders every frame by seeking all animations to an exact timestamp. The picture cannot drift from the audio.

![Frames from a rendered reel: green opener, word-by-word Arabic, flat icon, animated end card](docs/preview.jpg)

> Built for Arabic (often Islamic) podcast clips. Style: deep green, cream paper and gold; Amiri italic; words that blur in one by one; a "whip" transition on every cut; signature `edited by oussema.edits`.

---

## Features

| | |
|---|---|
| **Deterministic rendering** | `renderAt(t)` seeks every framer-motion animation and the shader clock to `t`, then Puppeteer screenshots the page. Frame `n` is always `t = n / 30`, so audio and picture stay in sync. |
| **One shader, six scene types** | A single three.js full-screen shader draws cream paper, deep green, full-bleed footage, a rounded footage card (on cream or on green) and full-screen 9:16 asset clips. It also adds grid, vignette and film grain. |
| **Arabic typography** | RTL lines of Amiri Italic / Bold Italic. Each word has its own entry time, and `*word` marks an accent colour. Words come in with blur, rise and fade, and leave together. |
| **Burned-in caption removal** | `scripts/clean.py` finds white glyph strokes in a box and inpaints them away (OpenCV Telea), frame by frame. |
| **Timed transcript** | `scripts/asr.py` combines Silero VAD with Whisper turbo (sherpa-onnx, CPU, int8). It is tuned for Gulf and Levantine dialect. |
| **User assets** | Any 9:16 clip can play full screen over a given sentence (mode 5), starting from its first frame. |
| **Flat icons, no 3D models** | Visual metaphors are thin-stroke SVGs animated with framer-motion. |
| **Sync verification** | `scripts/sync_check.py` cross-correlates the motion signal of reel and source and reports the offset in frames (it must be 0). |
| **Partial re-render** | You can re-render only the frame range of the scenes you changed, then splice it into the full video. |

## Quick start

```bash
npm run setup                      # node deps, fonts, Whisper turbo + VAD, creates src/plan.js
# 1. footage → frames (crop to the speaker, ~2x upscale, keep source fps)
python3 scripts/clean.py clip.mp4 clean.mp4 200 470 240 380        # only if captions are burned in
ffmpeg -i clean.mp4 -vf "crop=W:H:X:Y,scale=2*W:2*H:flags=lanczos" -q:v 2 public/frames/%04d.jpg
# 2. words + timing
ffmpeg -i clip.mp4 -vn -ac 1 -ar 16000 a.wav && python3 scripts/asr.py a.wav
# 3. write src/plan.js (scenes + lines), then preview a few timestamps
npm run preview -- 1.5,4,9,24          # → out/pv_<t>.jpg
# 4. render, add the voice track, mux
npm run render -- 0                    # → out/part_0000.mp4
scripts/audio.sh clip.mp4 58.2 out/voice.wav
ffmpeg -i out/part_0000.mp4 -i out/voice.wav -map 0:v -map 1:a -c:v libx264 -crf 20 \
       -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest out/final.mp4
# 5. prove sync
python3 scripts/sync_check.py out/final.mp4 clean.mp4 0 "90,790,900,560" "18,234,540,336" 3.0 4.2 29.5 4.5
```

Requirements: Node ≥ 18, Python 3.10+, ffmpeg, and Google Chrome at `/usr/bin/google-chrome` (change `executablePath` in `render.js` if yours is elsewhere).

## Writing a plan

```js
import { C, CFG, scene, line, ph, rays, icon, endCard, start } from './engine.js';

Object.assign(CFG, { NFR: 1746, SRC_FPS: 30, SRC_ASP: 1152 / 724, OFFSET: 0, END0: 58.2,
                     handle: 'oussema.edits', credit: 'Speaker · Podcast' });

{ const sc = scene(0, 2.72, 1); rays(sc);                                  // green typography
  line(sc, ph('ورأيَ *الأوغاد', 1.44, 2.4), 930, 150, 'b', C.cream, C.gold); }

{ const sc = scene(2.72, 7.5, 3, { card: [60, 760, 960, 604], zoom: [1, 1.05] });   // footage card
  line(sc, [['الصفحَ', 5.35], ['*عارًا', 6.33]], 610, 150, 'b', C.ink, C.green); }

{ const sc = scene(50.98, 53.68, 5, { asset: 'handshake', assetFrames: 90 }); }    // user asset

endCard(); start();
```

| Mode | Scene |
|---|---|
| `0` | cream paper + grid |
| `1` | deep green + grid |
| `2` | full-bleed footage, dark fade at the bottom for captions |
| `3` | rounded footage card on cream |
| `4` | rounded footage card on green |
| `5` | full-screen 9:16 asset clip from `public/assets/<name>/` |

`line(scene, words, y, size, 'b'|'s', colour, accent, tOut?)`: `ph(text, a, b)` spreads words over `[a, b]` by length; pass `[[word, t], …]` for exact times.

## Repository layout

```
podcast-reel-motion/
├── SKILL.md              Claude skill: the full workflow and the editor's rules
├── README.md
├── docs/
│   ├── ARCHITECTURE.md   how the renderer works, in detail
│   └── preview.jpg
├── package.json          build / preview / render scripts
├── render.js             static server + Puppeteer frame loop → ffmpeg
├── public/
│   └── index.html        layer stack: WebGL canvas · deco · text · footer
├── src/
│   ├── engine.js         shader, scene/line/icon/endCard helpers, renderAt(t)
│   └── plan.example.js   example plan (copied to src/plan.js by setup)
└── scripts/
    ├── setup.sh          one-time install
    ├── clean.py          burned-in caption removal (inpainting)
    ├── asr.py            VAD + Whisper turbo timed transcript
    ├── audio.sh          voice track: trim, end-card silence, loudnorm −14 LUFS
    └── sync_check.py     A/V sync proof (motion cross-correlation)
```

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the render pipeline, the time model and the shader.

## Using it as a Claude skill

`SKILL.md` is a ready-made skill. Add it to Claude, then send a clip with "kima 3mlna bakri" (or ask for this style). Claude runs the whole pipeline: it removes the captions, transcribes, plans the scenes, renders, checks sync, and delivers the mp4 with the script, the SRT and short Instagram/TikTok descriptions.

## Performance

On 2 CPU cores with SwiftShader WebGL, rendering runs at about 3 frames/s, so a 60 s reel (1 800 frames) takes about 10 minutes. Most of that time is Chrome's screenshot encode. When you change a few scenes, re-render only their frame ranges:

```bash
node render.js full 1528 1612          # → out/part_1528.mp4, then splice with ffmpeg trim + concat
```

---

<sub>edited by oussema.edits</sub>
