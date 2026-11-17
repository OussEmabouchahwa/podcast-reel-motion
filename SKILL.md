---
name: podcast-reel-motion
description: Turn a podcast clip (Arabic, often Islamic) into a vertical Insta/TikTok reel with three.js + framer-motion: green/cream/gold style, word-by-word Arabic captions, flat icons, user assets, oussema.edits signature, exact sync.
---

# Podcast reel (three.js + framer-motion)

Source repo: https://github.com/OussEmabouchahwa/podcast-reel-motion (same engine, plus `scripts/asr.py`, `audio.sh`, `sync_check.py`, `setup.sh`).

Builds the reel the user liked: deep-green and cream-paper scenes with a faint grid, the footage as a rounded card or full-bleed, Arabic words blurring in one by one (Amiri italic), gold/green accent words, white corner rays, a blur-push "whip" on every cut, a small "edited by oussema.edits" footer and an animated end card. Each frame is rendered in headless Chrome by seeking every animation to time t, so the picture can never drift from the audio.

Use this instead of `islamic-podcast-reels` when the user asks for this style, for three.js / framer motion, or "kima 3mlna bakri".

Reply in Tunisian darja (Arabic script). Keep messages short. Descriptions only when asked; when asked "s8ira" give 3 lines max per platform.

## The user's rules (learned the hard way)
- **No colours from the inspiration video.** Keep this palette: green #0E3B31, cream #F4EFE4, gold #D9A441, ink #151515, gray #7B776E.
- **No 3D models and no big translucent "ghost" words behind the text.** Visual metaphors are simple flat icons (thin-stroke SVG, dots, circles), animated with `icon()` or `track()`.
- **No figures of prophets, sahaba or Ahl al-Bayt**, no pig images; keep those as words.
- **Remove burned-in captions** from the source (inpaint, step 2) and any watermark/title of the page the clip came from (crop it out).
- **Signature**: footer "edited by oussema.edits" on every scene + end card. Add the speaker/podcast name under it when known.
- **Sync is mandatory**: audio and image must never be early or late. Reel time maps to source time by a fixed OFFSET; verify (step 6).
- **User assets** (a 9:16 clip the user sends "for this line"): play it full screen (mode 5) exactly over that sentence, text above and below the subject.
- Quran / hadith text exact, in «» or ﴿﴾. Tell the user which on-screen lines you added that the speaker did not say, and any word you could not verify.
- If an upload is the same file as an earlier one (`md5sum`), say so first.

## 1. Look at the clips
```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate,nb_frames -of compact v.mp4
ffmpeg -y -v error -i v.mp4 -vf "fps=2,scale=256:-1,tile=8x6" an/g%d.jpg      # contact sheets, Read them
# camera cuts (use as scene boundaries for footage scenes)
ffmpeg -v error -i v.mp4 -vf scale=96:72 -f rawvideo -pix_fmt gray - | python3 -c "
import sys,numpy as np; d=np.frombuffer(sys.stdin.buffer.read(),np.uint8).reshape(-1,72,96).astype(float)
df=np.abs(np.diff(d,axis=0)).mean((1,2)); print([i+1 for i in np.where(df>10)[0]])"   # frame numbers
```
If an inspiration video is given, sample it at 4 fps and note layout, typography, transitions and motifs; copy the *editing*, never its colours.

## 2. Clean the footage
- Social-media templates (title above, captions below, black bars): find the footage band (`mean` of gray rows) and crop to it.
- Burned-in captions on the picture: run `clean.py` with a box around them, then check that 0 frames still have bright white glyph pixels in that box:
```bash
pip install --break-system-packages -q opencv-python-headless
python3 clean.py v.mp4 clean.mp4 200 470 240 380
```
- Extract frames for the page (≈2x upscale, keep the source fps):
```bash
ffmpeg -y -v error -i clean.mp4 -vf "crop=W:H:X:Y,scale=2*W:2*H:flags=lanczos,unsharp=5:5:0.5:5:5:0" -q:v 2 public/frames/%04d.jpg
```
Set `CFG.NFR` = frame count, `CFG.SRC_FPS` = source fps, `CFG.SRC_ASP` = frame width/height. If the source is small (< 700 px wide) use card scenes (3/4) rather than full-bleed.

## 3. Words and timing
- Text: burned-in captions are the most reliable words (read them from crops, or detect when the caption region changes to get per-word times). Otherwise ASR.
- ASR: sherpa-onnx Whisper **turbo** (`https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-turbo.tar.bz2`, much better than small on Gulf dialect), with Silero VAD (`min_silence 0.08-0.3`, `max_speech 1.6-8`). Gives segment start/end; spread words inside a segment with `ph()`.
- Fix spelling (hamza, ة, tashkeel on key words). Write `script.txt` (full text + one-line idea in darja) and `captions.srt`.
- Measure exact speech onsets with 50 ms RMS when cutting a hook.

## 4. Project
```bash
P=/home/claude/reel; mkdir -p $P/src $P/public/frames $P/public/assets $P/out && cd $P
npm init -y >/dev/null && npm i three framer-motion puppeteer-core esbuild
G=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -sL -o public/Amiri-Italic.ttf $G/amiri/Amiri-Italic.ttf
curl -sL -o public/Amiri-BoldItalic.ttf $G/amiri/Amiri-BoldItalic.ttf
curl -sL -o public/Playfair-Italic.ttf "$G/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf"
```
Write `public/index.html`, `render.js`, `src/engine.js` (below, unchanged) and `src/plan.js` (per clip). `render.js` expects Chrome at `/usr/bin/google-chrome` (check with `which`). Asset clips: `ffmpeg -i asset.mp4 -t <scene length> -vf scale=1080:1920 -q:v 2 public/assets/<name>/%04d.jpg`.

## 5. Plan the reel (`src/plan.js`)
`scene(a, b, mode, opt)`, times in **reel seconds**:
- `0` cream paper, `1` deep green: typography scenes (hadith, key sentence, big single word). `rays(sc)` on strong green scenes.
- `2` full-bleed footage (dark fade at the bottom, captions there with `shadow:1`).
- `3` footage card on cream, `4` card on green: `card:[x,y,w,h]`, `zoom:[z0,z1]`, `cx` = face x (0..1). Text above/below the card, never on it.
- `5` asset clip full screen: `asset:'name', assetFrames:N`.
- `line(sc, words, y, size, 'b'|'s', colour, accentColour, tOut)`: `ph(text, start, end)` spreads words; `[[word,t],…]` for exact times; `*word` = accent. `tOut` makes a line leave before the next one replaces it at the same y.
- Accent: gold on green, green on cream. 1-2 accent words per line. Sizes: bold 96-150, single punch word 180-250, script 62-90.
- Cut every 2.5-5 s, alternate green / cream / footage, footage scenes never span a camera cut. Last scene ends at `CFG.END0`; `endCard()` fills `ENDD` (2.4 s).
- Hook: if the clip's first line is already strong, open on it (green typography) with OFFSET 0. Otherwise play the strongest line first (`src` option on that scene, OFFSET = hook length) and add a short teaser card in the speaker's dialect; tell the user the line plays twice.

## 6. Preview, render, audio, sync
```bash
npx esbuild src/plan.js --bundle --format=esm --target=chrome120 --outfile=public/bundle.js
node render.js preview 1.5,4,9,24,52,59.8      # → out/pv_T.jpg ; hstack them and Read
nohup node render.js full 0 > out/render.log 2>&1 &   # ~3 fps on 2 CPUs: a 60 s reel takes ~10 min, poll the log
```
Check every scene in previews: text not on faces or off-screen (Arabic lines are wide: 130 px × 8 words overflows), card position, accent readable on the background.

Audio (OFFSET 0 case; replace 58.2 by END0 and 57.9 by END0-0.3; for a hook, concat the hook trim + silence before the main clip so that part lasts exactly OFFSET):
```bash
ffmpeg -y -v error -i v.mp4 -filter_complex "[0:a]atrim=0:58.2,asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:d=0.03,afade=t=out:st=57.9:d=0.3[m];anullsrc=r=48000:cl=stereo,atrim=0:2.4[z];[m][z]concat=n=2:v=0:a=1,highpass=f=70,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[o]" -map "[o]" out/voice.wav
ffmpeg -y -v error -i out/part_0000.mp4 -i out/voice.wav -map 0:v -map 1:a -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k -shortest out/final.mp4
```
Sync check (repo `scripts/sync_check.py`): pick 2-3 reel windows of 3-5 s that each lie inside one footage scene; it cross-correlates the motion signal of the reel crop and the source crop and must print `lag +0` for every window. Also `ffprobe` that video and audio durations match.
```bash
python3 sync_check.py out/final.mp4 clean.mp4 0 "90,790,900,560" "18,234,540,336" 3.0 4.2 29.5 4.5
```

Changing a few scenes later: re-render only their frame ranges (`node render.js full FROM TO` → `part_FROM.mp4`), then splice with `trim=start_frame/end_frame` + `concat` onto the previous full video and remux the same voice.wav. Look at the frames on each splice boundary.

## 7. Deliver
- `SendUserFile` the mp4 (display render) + `script.txt` / `captions.srt` (attach), and write them to the user's `podcaste` folder with `device_commit_files` (request folder access again if the grant expired).
- Reply in darja: what the clip says (2-3 lines), what you did (captions removed, hook, icons), added lines, unverified words. Offer the description.
- Descriptions: Instagram (hook line + emoji, 1-3 lines, hadith if any, comment prompt, 6-10 hashtags incl. #تذكير #إسلام #بودكاست #explore) and TikTok (1-2 lines, 5-7 hashtags incl. #foryou #fyp).

## public/index.html
```html
<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:AmiriI;src:url(Amiri-Italic.ttf);font-weight:400}
@font-face{font-family:AmiriBI;src:url(Amiri-BoldItalic.ttf);font-weight:700}
@font-face{font-family:Playfair;src:url(Playfair-Italic.ttf);font-style:italic;font-weight:400 900}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#0E3B31}
#stage{position:absolute;inset:0;transform-origin:50% 50%}
#stage>*{position:absolute;left:0;top:0;width:1080px;height:1920px}
#foot{position:absolute;left:0;right:0;bottom:44px;text-align:center;font:italic 400 30px Playfair;letter-spacing:2px}
</style></head><body><div id="stage"><canvas id="bg" width="1080" height="1920"></canvas><div id="deco"></div><div id="text"></div></div>
<div id="foot"></div>
<script type="module" src="bundle.js"></script></body></html>
```

## render.js
```js
const puppeteer=require('puppeteer-core'); const {spawn}=require('child_process'); const http=require('http'); const fs=require('fs'); const path=require('path');
const mode=process.argv[2]||'preview'; const times=(process.argv[3]||'').split(',').filter(Boolean).map(Number);
const root=path.join(__dirname,'public');
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0])); fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);return r.end();} const ext=path.extname(f); r.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.jpg':'image/jpeg','.ttf':'font/ttf'}[ext]||'application/octet-stream'}); r.end(d);});}).listen(8765);
(async()=>{
  const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--font-render-hinting=none']});
  const p=await b.newPage(); await p.setViewport({width:1080,height:1920,deviceScaleFactor:1});
  p.on('console',m=>console.log('PAGE',m.text())); p.on('pageerror',e=>console.log('ERR',e.message));
  await p.goto('http://localhost:8765/index.html',{waitUntil:'load'});
  await p.waitForFunction('window.renderAt && window.ready',{timeout:60000}); await p.evaluate('window.ready');
  if(mode==='preview'){
    for(const t of times){ await p.evaluate(t=>window.renderAt(t),t); await p.screenshot({path:`out/pv_${t}.jpg`,type:'jpeg',quality:85}); }
  } else {
    const total=await p.evaluate('window.TOTAL'); const N=Math.round(total*30); const from=+(process.argv[3]||0), to=Math.min(+(process.argv[4]||N),N);
    const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p',`out/part_${String(from).padStart(4,'0')}.mp4`]);
    const st=Date.now();
    for(let f=from;f<to;f++){ await p.evaluate(t=>window.renderAt(t),f/30); const buf=await p.screenshot({type:'jpeg',quality:94,optimizeForSpeed:true}); if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r)); if(f%60===0) console.log('frame',f,'/',to,((Date.now()-st)/1000).toFixed(0)+'s'); }
    ff.stdin.end(); await new Promise(r=>ff.on('close',r));
  }
  await b.close(); srv.close();
})();
```
`node render.js preview t1,t2,…` writes screenshots; `node render.js full [FROM] [TO]` encodes frames FROM..TO-1 to `out/part_FROM.mp4`.

## clean.py
```python
import cv2, numpy as np, sys
# usage: python3 clean.py in.mp4 out.mp4 X0 X1 Y0 Y1   (box around the burned-in captions, source pixels)
src, dst = sys.argv[1], sys.argv[2]; X0, X1, Y0, Y1 = map(int, sys.argv[3:7])
cap = cv2.VideoCapture(src); fps = cap.get(5); w = int(cap.get(3)); h = int(cap.get(4))
out = cv2.VideoWriter(dst, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
while True:
    ok, f = cap.read()
    if not ok: break
    hsv = cv2.cvtColor(f[Y0:Y1, X0:X1], cv2.COLOR_BGR2HSV)
    m = ((hsv[..., 2] > 200) & (hsv[..., 1] < 60)).astype(np.uint8) * 255   # white text
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8); keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i][4] < 4000: keep[lab == i] = 255                           # glyph-sized blobs only (not white clothes)
    full = np.zeros((h, w), np.uint8); full[Y0:Y1, X0:X1] = cv2.dilate(keep, k, iterations=2)
    out.write(cv2.inpaint(f, full, 6, cv2.INPAINT_TELEA))
```

## src/engine.js
```js
// Reel engine: three.js draws backgrounds + footage (one shader), framer-motion animates DOM text/icons.
// Every animation is seeked by time, so renderAt(t) is deterministic frame by frame.
import * as THREE from 'three';
import { animate } from 'framer-motion';

export const W = 1080, H = 1920, FPS = 30;
export const C = { cream: '#F4EFE4', ink: '#151515', green: '#0E3B31', gold: '#D9A441', goldDark: '#A9771F', gray: '#7B776E' };
// CFG is filled by plan.js before start()
export const CFG = { NFR: 0, SRC_FPS: 30, SRC_ASP: 16 / 9, OFFSET: 0, END0: 60, ENDD: 2.4, handle: 'oussema.edits', credit: '' };

for (const f of ['400 40px AmiriI', '700 40px AmiriBI', 'italic 400 40px Playfair'])
  await document.fonts.load(f, 'سلام abc');

export const ease3 = x => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
const stage = document.getElementById('stage'), textL = document.getElementById('text'), decoL = document.getElementById('deco'), foot = document.getElementById('foot');

// ------------------------------------------------ three.js background / footage shader
// modes: 0 cream paper, 1 deep green, 2 full-bleed footage, 3 footage card on cream, 4 footage card on green, 5 full-screen 9:16 asset clip
const r1 = new THREE.WebGLRenderer({ canvas: document.getElementById('bg'), antialias: true, preserveDrawingBuffer: true });
r1.setPixelRatio(1); r1.setSize(W, H, false);
const cam = new THREE.OrthographicCamera(0, W, H, 0, -10, 10);
const mkTex = () => { const t = new THREE.Texture(); t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; return t; };
const footTex = mkTex(); const assetTex = new Map();     // one texture per image size (WebGL2 textures cannot change size)
const U = { uTex: { value: footTex }, uMode: { value: 0 }, uZoom: { value: 1 }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uCard: { value: new THREE.Vector4(60, 760, 960, 604) },
  uTime: { value: 0 }, uGrid: { value: 1 }, uSrcAsp: { value: 16 / 9 } };
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.ShaderMaterial({ uniforms: U, depthTest: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `precision highp float; varying vec2 vUv;
uniform sampler2D uTex; uniform float uMode,uZoom,uTime,uGrid,uSrcAsp; uniform vec2 uC; uniform vec4 uCard;
float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
vec3 foot(vec2 uv,float asp){ float hf=1.0/uZoom, wf=asp/uSrcAsp/uZoom;
  vec2 c=vec2(clamp(uC.x,wf*0.5,1.0-wf*0.5),clamp(uC.y,hf*0.5,1.0-hf*0.5)); vec3 col=texture2D(uTex,c+(uv-0.5)*vec2(wf,hf)).rgb;
  col=pow(col,vec3(1.04)); return mix(vec3(dot(col,vec3(.3,.59,.11))),col,1.06); }
float grid(vec2 q,float s){ vec2 g=abs(fract(q/s-0.5)-0.5)*s; return 1.0-smoothstep(0.0,1.6,min(g.x,g.y)); }
float rbox(vec2 p,vec2 b,float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }
void main(){ vec2 uv=vec2(vUv.x,1.0-vUv.y); vec2 q=uv*vec2(1080.,1920.); vec3 col; float gr=0.03;
  if(uMode>4.5){ col=texture2D(uTex,vec2(0.5)+(uv-0.5)/uZoom).rgb; col*=1.0-0.25*smoothstep(0.45,1.0,length((uv-0.5)*vec2(1.0,0.75))); }
  else if(uMode<0.5||(uMode>2.5&&uMode<3.5)){ float r=length((uv-vec2(0.5,0.45))*vec2(1.0,0.75));
    col=mix(vec3(0.957,0.937,0.894),vec3(0.86,0.83,0.77),smoothstep(0.35,0.95,r)); col=mix(col,col*0.86,grid(q,72.0)*0.55*uGrid); }
  else if(uMode<1.5||uMode>3.5){ float r=length((uv-vec2(0.5,0.42))*vec2(1.0,0.75));
    col=mix(vec3(0.075,0.27,0.225),vec3(0.03,0.13,0.11),smoothstep(0.15,0.95,r)); col=mix(col,col+vec3(0.05,0.08,0.07),grid(q,72.0)*0.7*uGrid); }
  else { col=foot(uv,0.5625); col*=1.0-0.35*smoothstep(0.4,1.0,length((uv-vec2(0.5,0.4))*vec2(1.0,0.8)));
    col=mix(col,vec3(0.02,0.08,0.065),smoothstep(0.52,0.86,uv.y)*0.88); col=mix(col,vec3(0.02,0.08,0.065),smoothstep(0.16,0.0,uv.y)*0.5); gr=0.05; }
  if(uMode>2.5&&uMode<4.5){ vec2 cc=uCard.xy+uCard.zw*0.5, hb=uCard.zw*0.5;
    col*=1.0-0.42*(1.0-smoothstep(-10.0,70.0,rbox(q-cc-vec2(0.,26.),hb,34.0))); float d=rbox(q-cc,hb,34.0);
    col=mix(col,foot((q-uCard.xy)/uCard.zw,uCard.z/uCard.w),1.0-smoothstep(-1.0,1.0,d)); col=mix(col,vec3(1.0),(1.0-smoothstep(0.0,2.0,abs(d+4.0)))*0.35); }
  col+=(hash(q+fract(uTime*7.3)*97.0)-0.5)*gr; gl_FragColor=vec4(clamp(col,0.,1.),1.0); }` }));
mesh.position.set(W / 2, H / 2, 0); const bgScene = new THREE.Scene(); bgScene.add(mesh);

// ------------------------------------------------ DOM + framer-motion helpers
const tracks = [];
export function el(html, css, parent) { const d = document.createElement('div'); d.innerHTML = html; Object.assign(d.style, css); parent.appendChild(d); return d; }
// keys: [[time, {props}], ...] relative to start; every key lists the same props
export function track(node, start, keys, ease = 'easeOut') {
  const T = keys[keys.length - 1][0]; const kf = {}; Object.keys(keys[0][1]).forEach(n => kf[n] = keys.map(k => k[1][n]));
  const ctrl = animate(node, kf, { duration: T, times: keys.map(k => k[0] / T), ease }); ctrl.pause(); ctrl.time = 0; tracks.push({ ctrl, start, T });
}
// framer-motion overwrites `transform`: never animate a node that is centred with ctr(); put it inside a ctr() wrapper
export const ctr = (x, y) => ({ position: 'absolute', left: x + 'px', top: y + 'px', transform: 'translate(-50%,-50%)', whiteSpace: 'nowrap' });
export const hid = { opacity: 0, y: 26, filter: 'blur(14px)', scale: 1 }, vis = { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 };
const FONT = { s: 'AmiriI', b: 'AmiriBI' };

const scenes = [];
// scene(a, b, mode, opt): a/b = reel seconds. opt: card [x,y,w,h], zoom [z0,z1], cx (0..1 face x), src (source time at scene start, for hooks), asset 'name', grid 0/1, shadow
export function scene(a, b, mode, opt = {}) {
  const d = el('', { position: 'absolute', inset: '0', display: 'none' }, decoL), t = el('', { position: 'absolute', inset: '0', display: 'none' }, textL);
  const sc = { a, b, mode, g: d, t, ...opt }; scenes.push(sc); return sc;
}
// words: [[text, time], ...]; '*word' = accent colour. Words blur in at their own time, all leave at tOut (default scene end).
export function line(sc, words, y, size, style, col, acc, tOut) {
  size = Math.round(size * 1.18);
  const row = el('', { ...ctr(540, y), display: 'flex', direction: 'rtl', gap: `${size * 0.26}px`, font: `${style === 'b' ? 700 : 400} ${size}px ${FONT[style]}`, lineHeight: '1.25' }, sc.t);
  words.forEach(([txt, ta]) => {
    const n = el(txt.replace('*', ''), { color: txt.startsWith('*') ? acc : col, display: 'inline-block' }, row);
    if (sc.shadow) n.style.textShadow = '0 6px 24px rgba(0,0,0,.55)';
    const end = (tOut ?? sc.b) - ta;
    track(n, ta - 0.04, [[0, hid], [0.32, vis], [Math.max(end - 0.12, 0.33), vis], [Math.max(end, 0.4), { opacity: 0, y: -10, filter: 'blur(10px)', scale: 1 }]], ['easeOut', 'linear', 'easeIn']);
  });
  return row;
}
// phrase -> words spread over [a,b] by character count
export const ph = (text, a, b) => { const ws = text.split(' '); const tot = ws.reduce((s, w) => s + w.replace('*', '').length, 0); let acc = 0;
  return ws.map(w => { const r = [w, a + (b - a) * 0.85 * acc / tot]; acc += w.replace('*', '').length; return r; }); };
// white spike rays in two corners
export function rays(sc, color = C.cream) {
  for (const top of [true, false]) {
    const d = el(`<svg width="520" height="520" viewBox="0 0 520 520"><g fill="${color}"><polygon points="520,0 300,150 330,175"/><polygon points="520,0 420,270 445,280"/><polygon points="520,0 180,40 185,70"/><polygon points="520,0 470,120 455,90"/></g></svg>`,
      { position: 'absolute', width: '520px', height: '520px', ...(top ? { right: '-10px', top: '-10px' } : { left: '-10px', bottom: '-10px', transform: 'rotate(180deg)' }) }, sc.g);
    d.firstChild.style.transformOrigin = '100% 0%';
    track(d.firstChild, sc.a, [[0, { scale: 0 }], [0.45, { scale: 1 }], [sc.b - sc.a, { scale: 1.06 }]], ['backOut', 'linear']);
  }
}
// simple flat icon (SVG/HTML string) that pops in at `start` and floats gently until scene end
export function icon(sc, html, x, y, start) {
  const n = el(html, {}, el('', ctr(x, y), sc.g));
  track(n, start, [[0, { opacity: 0, y: 120, rotate: -8, scale: 0.7 }], [0.6, { opacity: 1, y: 0, rotate: -3, scale: 1 }], [Math.max(sc.b - start, 0.7), { opacity: 1, y: -16, rotate: 3, scale: 1 }]], ['backOut', 'easeInOut']);
  return n;
}
// end card: EDITED BY / handle (letters stagger in) / gold underline / optional source credit
export function endCard() {
  const A = CFG.END0, D = CFG.ENDD; const sc = scene(A, A + D + 1, 0, { grid: 0 });
  const e0 = el('EDITED BY', { font: 'italic 400 40px Playfair', color: C.gray, letterSpacing: '14px', paddingLeft: '14px' }, el('', ctr(540, 850), sc.t));
  track(e0, A + 0.1, [[0, { opacity: 0, letterSpacing: '34px', filter: 'blur(8px)' }], [0.45, { opacity: 1, letterSpacing: '14px', filter: 'blur(0px)' }], [D, { opacity: 1, letterSpacing: '14px', filter: 'blur(0px)' }]]);
  const row = el('', { ...ctr(540, 960), display: 'flex', direction: 'ltr', font: 'italic 600 128px Playfair' }, sc.t);
  [...CFG.handle].forEach((ch, i) => { const n = el(ch, { display: 'inline-block', color: ch === '.' ? C.gold : C.green }, row);
    track(n, A + 0.25 + i * 0.035, [[0, { opacity: 0, y: 40, filter: 'blur(12px)' }], [0.4, { opacity: 1, y: 0, filter: 'blur(0px)' }], [D, { opacity: 1, y: 0, filter: 'blur(0px)' }]], ['backOut', 'linear']); });
  const bar = el('', { width: '100%', height: '100%', background: C.gold, borderRadius: '3px', transformOrigin: '0% 50%' }, el('', { ...ctr(540, 1060), width: row.getBoundingClientRect().width + 'px', height: '6px' }, sc.t));
  track(bar, A + 0.8, [[0, { scaleX: 0 }], [0.45, { scaleX: 1 }], [D, { scaleX: 1 }]], ['easeInOut', 'linear']);
  if (CFG.credit) { const sm = el(CFG.credit, { font: '400 40px AmiriI', color: C.gray, direction: 'rtl' }, el('', ctr(540, 1140), sc.t)); track(sm, A + 1.0, [[0, hid], [0.4, vis], [D, vis]]); }
}

// ------------------------------------------------ frames + render loop
const cache = new Map();
async function bitmap(url, store, keep) {
  if (store.has(url)) return store.get(url);
  const bm = await createImageBitmap(await (await fetch(url)).blob()); store.set(url, bm);
  if (keep && store.size > keep) { const k = store.keys().next().value; store.get(k).close?.(); store.delete(k); } return bm;
}
const assetBm = new Map(); const pad = i => String(i + 1).padStart(4, '0');
export function start() {
  footer();
  window.TOTAL = CFG.END0 + CFG.ENDD;
  window.renderAt = async (t) => {
    const TOTAL = window.TOTAL;
    const sc = scenes.find(s => t >= s.a && t < s.b) || scenes[scenes.length - 1];
    scenes.forEach(s => { const on = s === sc; s.g.style.display = on ? 'block' : 'none'; s.t.style.display = on ? 'block' : 'none'; });
    const tl = t - sc.a, dur = sc.b - sc.a, kick = 1 + 0.06 * (1 - ease3(tl / 0.35));
    U.uTime.value = t; U.uMode.value = sc.mode; U.uGrid.value = sc.grid ?? 1;
    if (sc.asset) {                                     // asset clip plays from its first frame at scene start
      const n = sc.assetFrames ?? 9999; const bm = await bitmap(`assets/${sc.asset}/${pad(Math.min(Math.floor(tl * FPS + 1e-6), n - 1))}.jpg`, assetBm);
      const key = sc.asset; if (!assetTex.has(key)) assetTex.set(key, mkTex()); const tx = assetTex.get(key);
      if (tx.image !== bm) { tx.image = bm; tx.needsUpdate = true; } U.uTex.value = tx; U.uZoom.value = (1 + 0.05 * tl / dur) * kick;
    } else if (sc.mode >= 2 && t < CFG.END0) {          // footage: source time = reel time - OFFSET (or sc.src + tl for hook scenes)
      const s = sc.src !== undefined ? sc.src + tl : t - CFG.OFFSET;
      const bm = await bitmap(`frames/${pad(Math.min(Math.max(Math.floor(s * CFG.SRC_FPS + 1e-6), 0), CFG.NFR - 1))}.jpg`, cache, 6);
      if (footTex.image !== bm) { footTex.image = bm; footTex.needsUpdate = true; } U.uTex.value = footTex; U.uSrcAsp.value = CFG.SRC_ASP;
      const z = sc.zoom ? sc.zoom[0] + (sc.zoom[1] - sc.zoom[0]) * tl / dur : 1; U.uZoom.value = z * kick; U.uC.value.set(sc.cx ?? 0.5, sc.cy ?? 0.5);
      if (sc.card) U.uCard.value.set(sc.card[0], sc.card[1] + 60 * (1 - ease3(tl / 0.5)), sc.card[2], sc.card[3]);
    }
    r1.render(bgScene, cam);
    // whip transition: blur + push + scale in the first 0.2 s and last 0.14 s of every scene
    const tin = tl / 0.2, tout = (sc.b - t) / 0.14; let y = 0, blur = 0, sca = 1;
    if (tin < 1 && sc.a > 0) { const k = 1 - ease3(tin); y = 90 * k; blur = 22 * k; sca = 1 + 0.11 * k; }
    if (tout < 1 && sc.b < TOTAL) { const k = 1 - tout; y = -80 * k * k; blur = Math.max(blur, 20 * k * k); sca = Math.max(sca, 1 + 0.1 * k * k); }
    stage.style.transform = `translateY(${y.toFixed(1)}px) scale(${sca.toFixed(4)})`; stage.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none';
    const dark = sc.mode === 1 || sc.mode === 2 || sc.mode === 4;
    foot.style.color = dark ? 'rgba(244,239,228,.55)' : 'rgba(21,21,21,.45)'; foot.style.opacity = t >= CFG.END0 ? 0 : 1;
    for (const tr of tracks) tr.ctrl.time = Math.min(Math.max(t - tr.start, 0), tr.T);
    return true;
  };
  window.ready = Promise.resolve(true);
}
function footer() { foot.textContent = 'edited by ' + CFG.handle; }
```

## src/plan.js (example)
```js
import { C, CFG, scene, line, ph, rays, icon, endCard, start } from './engine.js';
// SRC_ASP = width/height of the extracted frames; OFFSET = reel time where source 0 plays (hook length, or 0)
Object.assign(CFG, { NFR: 1746, SRC_FPS: 30, SRC_ASP: 1152 / 724, OFFSET: 0, END0: 58.2, ENDD: 2.4, handle: 'oussema.edits', credit: 'ياسر الحزيمي · بودكاست بدون ورق' });
const CARD = [60, 760, 960, 604], TALL = [170, 520, 740, 900];   // [x, y, w, h] in px
// green typography opener (the clip's own strongest line)
{ const sc = scene(0, 2.72, 1); rays(sc);
  line(sc, ph('إيّاكم', 0.09, 0.9), 700, 150, 'b', C.cream, C.gold);
  line(sc, ph('ورأيَ *الأوغاد', 1.44, 2.4), 930, 150, 'b', C.cream, C.gold); }
// footage card on cream, text above it
{ const sc = scene(2.72, 7.5, 3, { card: CARD, zoom: [1.0, 1.05] });
  line(sc, ph('قالوا: وما رأيُ *الأوغاد؟', 2.84, 4.1), 520, 96, 'b', C.ink, C.green, 4.22);   // tOut: leaves before the next line
  line(sc, [['الصفحَ', 5.35], ['*عارًا', 6.33]], 610, 150, 'b', C.ink, C.green); }       // exact per-word times
// green + simple flat icon
{ const sc = scene(34.52, 38.5, 1);
  icon(sc, '<svg width="460" height="320" viewBox="0 0 460 320" fill="none" stroke="#F4EFE4" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><rect x="10" y="10" width="440" height="300" rx="22"/><polyline points="10,26 230,180 450,26"/><circle cx="230" cy="186" r="24" fill="#D9A441" stroke="none"/></svg>', 540, 1200, 34.7);
  line(sc, ph('قال له: إذا أتاك *كتابي', 34.59, 35.95), 400, 104, 'b', C.cream, C.gold); }
// user asset clip, full screen
{ const sc = scene(50.98, 53.68, 5, { asset: 'handshake', assetFrames: 90 });
  line(sc, ph('«وخيرُهما', 51.16, 51.8), 330, 130, 'b', C.ink, C.ink);
  line(sc, ph('الذي يبدأ بالسلام»', 51.85, 53.5), 1560, 130, 'b', C.ink, C.ink); }
// full-bleed footage, captions at the bottom over the dark fade
{ const sc = scene(53.68, CFG.END0, 2, { zoom: [1.1, 1.15], shadow: 1 });
  line(sc, ph('فأنِف ابن *الحنفية', 53.72, 55.3), 1450, 116, 'b', C.cream, C.gold); }
endCard();
start();
```
(The example has gaps between scenes for brevity; a real plan covers 0 → END0 with no gaps.)
