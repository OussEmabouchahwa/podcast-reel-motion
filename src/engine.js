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
