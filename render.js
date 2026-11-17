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
