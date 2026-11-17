import { C, CFG, scene, line, ph, rays, icon, endCard, start } from './engine.js';
Object.assign(CFG, { NFR: 1746, SRC_FPS: 30, SRC_ASP: 1152 / 724, OFFSET: 0, END0: 58.2, ENDD: 2.4, handle: 'oussema.edits', credit: 'ياسر الحزيمي · بودكاست بدون ورق' });
const CARD = [60, 760, 960, 604], TALL = [170, 520, 740, 900];
{ const sc = scene(0, 2.72, 1); rays(sc);
  line(sc, ph('إيّاكم', 0.09, 0.9), 700, 150, 'b', C.cream, C.gold);
  line(sc, ph('ورأيَ *الأوغاد', 1.44, 2.4), 930, 150, 'b', C.cream, C.gold); }
{ const sc = scene(2.72, 7.5, 3, { card: CARD, zoom: [1.0, 1.05] });
  line(sc, ph('قالوا: وما رأيُ *الأوغاد؟', 2.84, 4.1), 520, 96, 'b', C.ink, C.green, 4.22);
  line(sc, [['الصفحَ', 5.35], ['*عارًا', 6.33]], 610, 150, 'b', C.ink, C.green); }
{ const sc = scene(7.5, 22.03, 1);
  icon(sc, '<svg width="460" height="320" viewBox="0 0 460 320" fill="none" stroke="#F4EFE4" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><rect x="10" y="10" width="440" height="300" rx="22"/><polyline points="10,26 230,180 450,26"/><circle cx="230" cy="186" r="24" fill="#D9A441" stroke="none"/></svg>', 540, 1200, 7.7);
  line(sc, ph('إيش *المرجعية؟', 7.63, 8.5), 500, 140, 'b', C.cream, C.gold); }
{ const sc = scene(22.03, 50.98, 4, { card: TALL, zoom: [1.0, 1.06], cx: 0.6 });
  line(sc, ph('تخيّل هذا *المشهد', 23.2, 23.95), 330, 120, 'b', C.cream, C.gold); }
{ const sc = scene(50.98, 53.68, 5, { asset: 'handshake', assetFrames: 90 });
  line(sc, ph('«وخيرُهما', 51.16, 51.8), 330, 130, 'b', C.ink, C.ink);
  line(sc, ph('الذي يبدأ بالسلام»', 51.85, 53.5), 1560, 130, 'b', C.ink, C.ink); }
{ const sc = scene(53.68, CFG.END0, 2, { zoom: [1.1, 1.15], shadow: 1 });
  line(sc, ph('فأنِف ابن *الحنفية', 53.72, 55.3), 1450, 116, 'b', C.cream, C.gold); }
endCard();
start();
