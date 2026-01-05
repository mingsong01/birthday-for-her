const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile =
  window.matchMedia("(max-width: 820px)").matches ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.2 : 1.6);

const CONFIG = {
  dateISO: "2026-01-03",
  miniLines: [
    "一份很轻、很认真、只给你的祝福",
    "把今天的温柔，交给你慢慢拆",
    "愿你从容，愿你被偏爱",
    "愿你不赶时间，只赶快乐",
    "愿你把平凡过得很漂亮"
  ],
  quotes: [
    "愿你把热爱留给自己，把答案交给时间。",
    "愿你一直明亮，但不必讨好任何目光。",
    "愿你在自己的节奏里，越走越笃定。",
    "愿你把温柔当作选择，而不是习惯。",
    "愿你被理解，也被认真地偏爱。",
    "愿你不慌不忙，像风一样自由，像光一样安静。",
    "愿你把喜欢的事做成日常，把想要的生活慢慢兑现。",
    "愿你总有退路，也总有底气。",
    "愿你不必解释太多，就足够好。",
    "愿你与世界保持一点距离，与自己保持最亲近。"
  ],
  quoteSigns: [
    "写给小雨 · 只字不喧",
    "给你 · 不打扰的在意",
    "给你 · 认真但克制",
    "给你 · 温柔留白",
    "给你 · 明亮而安静"
  ],
  wishes: [
    "今天的好运，偏向你一点。",
    "把喜欢留在今天，把惊喜带去明天。",
    "愿你心里柔软，生活明亮。",
    "愿你所到之处皆有花开。",
    "愿你被温柔以待，也有温柔以还。",
    "愿你不赶时间，只赶快乐。",
    "愿你把平凡过得很漂亮。",
    "愿你在新的一岁里，更笃定、更自由。"
  ],
  starLines: [
    "愿你被世界温柔以待，也永远有能力温柔地选择。",
    "愿你把喜欢的事做成日常，把想要的生活过成现实。",
    "愿你走在自己的路上，光就会跟着你。",
    "愿你收获爱与自信，也收获不必解释的从容。",
    "愿你有足够的浪漫，也有足够的清醒。"
  ],
  fireLines: [
    "这一束光，送给今天的你。",
    "愿你常明，愿你有松风作伴。",
    "祝你被偏爱，也被理解。",
    "愿你在更自由的地方，遇见更好的自己。",
    "愿你把热爱藏进日常，把快乐留在当下。"
  ]
};

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
function scrollToId(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.scrollIntoView({behavior: reducedMotion ? "auto" : "smooth", block:"start"});
}
function runIdle(fn, timeout=900){
  if("requestIdleCallback" in window){
    window.requestIdleCallback(fn, { timeout });
  }else{
    setTimeout(fn, 120);
  }
}

/* -----------------------------
   纹理延迟加载（不抢首屏）
------------------------------ */
function loadTextureAfterLoad(){
  const img = $(".texture");
  if(!img) return;
  const src = img.dataset.src;
  if(!src) return;
  // 等 load 后再在 idle 设置 src
  window.addEventListener("load", ()=>{
    runIdle(()=>{ img.src = src; }, 1200);
  }, { once:true });
}

/* -----------------------------
   音频：移动端需要用户手势解锁
------------------------------ */
let audioCtx = null;
let analyser = null;
let sourceNode = null;
let audioReady = false;
let audioPlaying = false;

function primeAudio(){
  const audio = $("#bgm");
  if(!audio) return;
  if(audio.src) return;
  const src = audio.dataset.src;
  if(!src) return;
  audio.src = src;
}

function setupAudioGraphIfNeeded(){
  if(audioReady) return;
  const audio = $("#bgm");
  if(!audio || !audio.src) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  sourceNode = audioCtx.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  audioReady = true;
}

function showSoundGate(show){
  const gate = $("#soundGate");
  if(!gate) return;
  gate.classList.toggle("show", !!show);
}

function fadeVolumeTo(target, ms=900){
  const audio = $("#bgm");
  if(!audio) return;
  const start = audio.volume;
  const t0 = performance.now();
  function step(t){
    const k = clamp((t - t0)/ms, 0, 1);
    const kk = 1 - Math.pow(1-k, 3);
    audio.volume = start + (target - start)*kk;
    if(k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * 关键：把“play + unmute”放在用户点击事件的同步栈中
 * 否则移动端会 NotAllowedError。:contentReference[oaicite:4]{index=4}
 */
function unlockAndPlayFromGesture(){
  const audio = $("#bgm");
  if(!audio) return;

  try{
    primeAudio();
    setupAudioGraphIfNeeded();

    // iOS/Chrome 更稳：先 volume=0，然后 play，再渐入
    audio.muted = false;
    audio.volume = 0.0;

    const p = audio.play(); // 必须由手势触发
    audioPlaying = true;

    $("#musicIcon").textContent = "Ⅱ";
    $("#musicText").textContent = "已播放";
    $("#musicBtn")?.classList.remove("pulse");

    if(audioCtx && audioCtx.state === "suspended"){
      // 也在同一次手势里 resume
      audioCtx.resume().catch(()=>{});
    }

    // play() 可能被拒绝（返回 Promise），要捕获
    if(p && typeof p.catch === "function"){
      p.catch(()=>{
        audioPlaying = false;
        $("#musicIcon").textContent = "♪";
        $("#musicText").textContent = "轻音乐";
        $("#musicBtn")?.classList.add("pulse");
        showSoundGate(true);
      });
    }

    fadeVolumeTo(0.55, 900);
    showSoundGate(false);
  }catch{
    showSoundGate(true);
  }
}

function toggleAudio(){
  const audio = $("#bgm");
  if(!audio) return;

  // 如果还没能播放，就直接走解锁流程（让用户一次点击就能解决）
  if(!audioPlaying){
    unlockAndPlayFromGesture();
    return;
  }

  try{
    if(audio.paused){
      audio.play();
      audioPlaying = true;
      $("#musicIcon").textContent = "Ⅱ";
      $("#musicText").textContent = "已播放";
      $("#musicBtn")?.classList.remove("pulse");
    }else{
      audio.pause();
      audioPlaying = false;
      $("#musicIcon").textContent = "♪";
      $("#musicText").textContent = "轻音乐";
      $("#musicBtn")?.classList.add("pulse");
      showSoundGate(true);
    }
  }catch{
    showSoundGate(true);
  }
}

/* 静音自动播放：能成就成，不成就优雅提示用户点一下 */
async function tryMutedAutoplay(){
  const audio = $("#bgm");
  if(!audio) return;

  try{
    primeAudio();
    audio.muted = true;
    audio.volume = 0.0;

    const p = audio.play();
    if(p && typeof p.then === "function") await p;

    // 静音播放成功：显示“已就绪”，但仍需用户手势才能开声（多数浏览器如此）
    audioPlaying = true;
    $("#musicIcon").textContent = "Ⅱ";
    $("#musicText").textContent = "已就绪";
    $("#musicBtn")?.classList.remove("pulse");

    // 给用户一个极简入口开启声音
    showSoundGate(true);
  }catch{
    // 被拦截：直接提示点一下
    showSoundGate(true);
  }
}

/* Visualizer（无音频时也不阻塞） */
function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}
function drawViz(){
  const c = $("#viz");
  if(!c) return;
  const ctx = c.getContext("2d");
  const data = new Uint8Array(128);
  function loop(){
    const w = c.width, h = c.height;
    ctx.clearRect(0,0,w,h);
    if(analyser && audioPlaying && !reducedMotion){
      analyser.getByteFrequencyData(data);
      const bars = 24;
      const step = Math.floor(data.length / bars);
      const gap = 3;
      const barW = Math.floor((w - gap*(bars-1)) / bars);
      for(let i=0;i<bars;i++){
        const v = data[i*step] / 255;
        const bh = Math.max(3, Math.floor(v * (h-6)));
        const x = i*(barW+gap);
        const y = h - bh;
        roundRect(ctx, x, y, barW, bh, 6);
        ctx.fillStyle = "rgba(42,34,27,.26)";
        ctx.fill();
      }
    }else{
      ctx.fillStyle = "rgba(42,34,27,.18)";
      roundRect(ctx, 0, h-6, w, 6, 6);
      ctx.fill();
    }
    requestAnimationFrame(loop);
  }
  loop();
}

/* -----------------------------
   Spotlight
------------------------------ */
function mountSpotlight(){
  const s = $("#spotlight");
  if(!s) return;
  let x = 20, y = 20;
  function set(){
    s.style.background = `radial-gradient(520px 340px at ${x}% ${y}%, rgba(255,255,255,.58), transparent 62%)`;
  }
  set();
  window.addEventListener("pointermove", (e)=>{
    const xx = (e.clientX / window.innerWidth) * 100;
    const yy = (e.clientY / window.innerHeight) * 100;
    x = x + (xx - x) * 0.06;
    y = y + (yy - y) * 0.06;
    set();
  }, {passive:true});
}

/* -----------------------------
   Petals：更晚启动（hero load 后再 idle）
------------------------------ */
function startPetals(){
  const canvas = $("#petals");
  if(!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const img = new Image();
  img.src = "assets/img/petals.webp";

  function resize(){
    canvas.width = Math.floor(window.innerWidth * DPR);
    canvas.height = Math.floor(window.innerHeight * DPR);
  }
  resize();
  window.addEventListener("resize", resize, { passive:true });

  const N = reducedMotion ? 6 : (isMobile ? 10 : 18);
  const petals = Array.from({length:N}).map(()=> spawn());

  function spawn(){
    const w = canvas.width, h = canvas.height;
    return {
      x: Math.random()*w,
      y: Math.random()*h,
      s: (isMobile ? 0.16 : 0.18) + Math.random()*(isMobile ? 0.22 : 0.28),
      r: Math.random()*Math.PI*2,
      vr: (-0.004 + Math.random()*0.008),
      vx: (0.05 + Math.random()*(isMobile ? 0.10 : 0.14)) * DPR,
      vy: (0.18 + Math.random()*(isMobile ? 0.30 : 0.42)) * DPR,
      o: 0.10 + Math.random()*0.18
    };
  }

  function tick(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(img.complete){
      for(let p of petals){
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;

        if(p.y > canvas.height + 120*DPR || p.x > canvas.width + 140*DPR){
          Object.assign(p, spawn(), { x: -120*DPR, y: Math.random()*canvas.height*0.65 });
        }

        ctx.save();
        ctx.globalAlpha = p.o;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        const base = isMobile ? 170 : 210;
        const size = base * p.s * DPR;
        ctx.drawImage(img, -size/2, -size/2, size, size);
        ctx.restore();
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
}

/* -----------------------------
   Letter
------------------------------ */
function openLetter(){
  $("#letterDlg")?.showModal();
}
function bindLetter(){
  $("#openLetterBtn")?.addEventListener("click", openLetter);
  $("#envelope")?.addEventListener("click", openLetter);
  $("#copyLetterBtn")?.addEventListener("click", async ()=>{
    const text = $$("#letterBody p").map(p=>p.textContent.trim()).join("\n");
    await navigator.clipboard.writeText(text);
  });
}

/* Past */
function bindPast(){
  $("#pastBtn")?.addEventListener("click", ()=>{
    $("#pastDlg")?.showModal();
  });
}

/* Whispers */
function mountWhispers(){
  const qEl = $("#quoteText");
  const sEl = $("#quoteSign");
  const wEl = $("#wishText");
  const starLine = $("#starLine");
  const miniLine = $("#miniLine");
  const fireLine = $("#fireLine");

  function setQuote(){
    qEl.textContent = rand(CONFIG.quotes);
    sEl.textContent = rand(CONFIG.quoteSigns);
  }
  function setWish(){ wEl.textContent = rand(CONFIG.wishes); }
  function setStarLine(){ starLine.textContent = rand(CONFIG.starLines); }
  function setMini(){ miniLine.textContent = rand(CONFIG.miniLines); }
  function setFireLine(){ fireLine.textContent = rand(CONFIG.fireLines); }

  setQuote(); setWish(); setStarLine(); setMini(); setFireLine();

  $("#nextQuoteBtn")?.addEventListener("click", setQuote);
  $("#newWishBtn")?.addEventListener("click", setWish);

  $("#copyQuoteBtn")?.addEventListener("click", async ()=>{
    await navigator.clipboard.writeText(qEl.textContent.trim());
  });

  const active = new Set();
  $$(".chipBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.dataset.k;
      btn.classList.toggle("active");
      if(btn.classList.contains("active")) active.add(k); else active.delete(k);
    });
  });

  $("#composeBtn")?.addEventListener("click", ()=>{
    const keys = [...active];
    $("#composerOut").textContent = composeLine(keys);
  });
}
function composeLine(keys){
  const head = rand([
    "愿你在新的一岁里",
    "愿你把日子过得更轻盈一些",
    "愿你一直被温柔照亮",
    "愿你心里始终有光"
  ]);
  const midMap = { "明亮":"更明亮", "自由":"更自由", "浪漫":"更浪漫", "从容":"更从容", "好运":"更好运" };
  const mid = keys.length ? ("也愿你 " + keys.map(k=>midMap[k]||k).join("、") + "。") : "也愿你更笃定、更自在。";
  const tail = rand([
    "不必很用力，也能被世界认真喜欢。",
    "把热爱留给自己，把答案交给时间。",
    "你走到哪里，哪里就有好风景。",
    "所有美好，都在路上向你靠近。",
    "愿你常明，也愿你有松风作伴。"
  ]);
  return `${head}，${mid}${tail}`;
}

/* Stars（延迟启动） */
function mountStars(){
  const c = $("#stars");
  if(!c) return;
  const ctx = c.getContext("2d");

  function fit(){
    const cssW = c.clientWidth;
    c.width = Math.floor(cssW * DPR);
    c.height = Math.floor((cssW * 0.43) * DPR);
    draw();
  }
  window.addEventListener("resize", fit, { passive:true });

  const pts = [];
  let last = null;

  function star(x, y, innerR, outerR, points){
    ctx.save();
    ctx.translate(x,y);
    ctx.beginPath();
    for(let i=0;i<points*2;i++){
      const r = (i%2===0) ? outerR : innerR;
      const a = (Math.PI/points)*i;
      ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fill();
    ctx.strokeStyle = "rgba(42,34,27,.18)";
    ctx.lineWidth = 1.5 * DPR;
    ctx.stroke();
    ctx.restore();
  }

  function draw(){
    const w = c.width, h = c.height;
    ctx.clearRect(0,0,w,h);
    const g = ctx.createRadialGradient(w*0.2,h*0.2,10,w*0.2,h*0.2,w*0.9);
    g.addColorStop(0, "rgba(255,214,232,.20)");
    g.addColorStop(1, "rgba(207,232,255,.10)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    if(pts.length > 1){
      ctx.strokeStyle = "rgba(42,34,27,.20)";
      ctx.lineWidth = 2 * DPR;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    for(const p of pts) star(p.x, p.y, 5*DPR, 12*DPR, 5);

    if(last && !reducedMotion){
      ctx.globalAlpha = 0.32;
      star(last.x, last.y, 4*DPR, 9*DPR, 5);
      ctx.globalAlpha = 1;
    }
  }

  function getPos(ev){
    const rect = c.getBoundingClientRect();
    const x = (ev.clientX - rect.left) / rect.width * c.width;
    const y = (ev.clientY - rect.top) / rect.height * c.height;
    return {x, y};
  }

  c.addEventListener("mousemove", (ev)=>{ last = getPos(ev); draw(); }, { passive:true });
  c.addEventListener("mouseleave", ()=>{ last = null; draw(); }, { passive:true });
  c.addEventListener("click", (ev)=>{
    pts.push(getPos(ev));
    if(pts.length > 16) pts.shift();
    draw();
  });

  $("#clearStarsBtn")?.addEventListener("click", ()=>{ pts.length=0; draw(); });
  $("#saveStarsBtn")?.addEventListener("click", ()=>{
    const a = document.createElement("a");
    a.download = "xiaoYu-stars.png";
    a.href = c.toDataURL("image/png");
    a.click();
  });

  fit();
}

/* -----------------------------
   Fireworks：直到滚动接近模块才创建引擎
------------------------------ */
class FireworksEngine{
  constructor(canvas){
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = DPR;
    this.running = false;
    this.rockets = [];
    this.parts = [];
    this.ribbons = [];
    this.lastT = 0;

    this.fade = reducedMotion ? 0.22 : (isMobile ? 0.20 : 0.14);
    this.startedOnce = false;

    this._fit();
    window.addEventListener("resize", ()=> this._fit(), { passive:true });
  }

  _fit(){
    this.c.width = Math.floor(window.innerWidth * this.dpr);
    this.c.height = Math.floor(window.innerHeight * this.dpr);
  }

  ignite(mult=1){
    const n = reducedMotion ? 2 : (isMobile ? 3 : 5);
    let count = 0;
    const tick = ()=>{
      this.launch();
      count++;
      if(count < n*mult) setTimeout(tick, 420 + Math.random()*240);
    };
    tick();
    this._ensureRun();
  }

  _palette(){
    const base = [
      [255, 182, 210],
      [196, 226, 255],
      [208, 248, 232],
      [255, 236, 186],
      [226, 210, 255]
    ];
    const pick = base[Math.floor(Math.random()*base.length)];
    const jitter = ()=> (Math.random()*18 - 9);
    return [
      clamp(pick[0] + jitter(), 0, 255),
      clamp(pick[1] + jitter(), 0, 255),
      clamp(pick[2] + jitter(), 0, 255)
    ];
  }

  launch(){
    const w = this.c.width, h = this.c.height;
    const x = (0.18 + Math.random()*0.64) * w;
    const y = h + 30*this.dpr;
    const vx = (Math.random()*2-1) * 0.55 * this.dpr;
    const vy = (- (8.2 + Math.random()*2.6)) * this.dpr;
    const col = this._palette();
    this.rockets.push({ x,y,vx,vy, ax:(Math.random()*2-1)*0.008*this.dpr, life:0, fuse:50+Math.random()*24, col });
  }

  burst(x,y){
    const col = this._palette();
    const coreN  = reducedMotion ? 40 : (isMobile ? 70 : 120);

    for(let i=0;i<coreN;i++){
      const a = Math.random()*Math.PI*2;
      const sp = (2.0 + Math.random()*4.2) * this.dpr;
      this.parts.push({
        x,y, px:x, py:y,
        vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
        life:0, ttl: 52 + Math.random()*24,
        drag: 0.986,
        g: (0.11 + Math.random()*0.06) * this.dpr,
        col,
        a: 0.72,
        s: (0.55 + Math.random()*0.75) * this.dpr
      });
    }
    this.parts.push({ kind:"flash", x,y, life:0, ttl: 10, r: 40*this.dpr, a: 0.9 });
  }

  _ensureRun(){
    if(this.running) return;
    this.running = true;
    this.lastT = performance.now();
    requestAnimationFrame((t)=> this._frame(t));
  }

  _rgba([r,g,b], a){ return `rgba(${r|0},${g|0},${b|0},${a})`; }

  _frame(t){
    const dt = clamp((t - this.lastT)/16.666, 0.6, 2.2);
    this.lastT = t;

    const ctx = this.ctx;
    const w = this.c.width, h = this.c.height;

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
    ctx.fillRect(0,0,w,h);

    // rockets
    for(let i=this.rockets.length-1;i>=0;i--){
      const r = this.rockets[i];
      r.life += dt;
      r.vx += r.ax * dt;
      r.vy += (0.10*this.dpr) * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;

      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = this._rgba(r.col, 0.85);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.6*this.dpr, 0, Math.PI*2);
      ctx.fill();

      if(r.life > r.fuse || r.vy > -1.5*this.dpr){
        this.burst(r.x, r.y);
        this.rockets.splice(i,1);
      }
    }

    // parts
    for(let i=this.parts.length-1;i>=0;i--){
      const p = this.parts[i];
      p.life += dt;
      const k = p.life / p.ttl;
      if(k >= 1){ this.parts.splice(i,1); continue; }

      if(p.kind === "flash"){
        ctx.globalCompositeOperation = "lighter";
        const a = (1-k) * p.a;
        const r = p.r*(1+0.25*k);
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
        g.addColorStop(0, `rgba(255,255,255,${0.85*a})`);
        g.addColorStop(0.35, `rgba(255,255,255,${0.18*a})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x,p.y,r,0,Math.PI*2);
        ctx.fill();
        continue;
      }

      p.px = p.x; p.py = p.y;
      p.vx *= Math.pow(p.drag, dt);
      p.vy *= Math.pow(p.drag, dt);
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const a = p.a * (1-k);
      ctx.globalCompositeOperation = "lighter";

      ctx.strokeStyle = this._rgba(p.col, 0.45);
      ctx.lineWidth = Math.max(1.2*this.dpr, 2.8*p.s);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.px,p.py);
      ctx.lineTo(p.x,p.y);
      ctx.stroke();

      ctx.fillStyle = this._rgba(p.col, a);
      ctx.beginPath();
      ctx.arc(p.x,p.y, 2.0*p.s, 0, Math.PI*2);
      ctx.fill();
    }

    const idle = this.rockets.length===0 && this.parts.length===0;
    if(idle){ this.running = false; return; }
    requestAnimationFrame((tt)=> this._frame(tt));
  }
}

let fw = null;
function mountFireworksOnDemand(){
  const section = $("#fireworksSection");
  const canvas = $("#fireworksGlobal");
  if(!section || !canvas) return;

  const ensure = ()=>{
    if(fw) return fw;
    fw = new FireworksEngine(canvas);
    $("#igniteBtn")?.addEventListener("click", ()=> fw.ignite(1));
    $("#igniteMoreBtn")?.addEventListener("click", ()=> fw.ignite(2));
    return fw;
  };

  const obs = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        const eng = ensure();
        if(!eng.startedOnce){
          eng.startedOnce = true;
          eng.ignite(2);
        }
      }
    }
  }, { threshold: 0.25 });

  obs.observe(section);
}

/* -----------------------------
   主题 / 导航 / 分享
------------------------------ */
const themes = [
  { name:"奶油", vars: { "--bg0":"#fff7ef", "--bg1":"#f6fbff", "--a":"#ffd6e8", "--b":"#cfe8ff", "--c":"#dff6ea", "--d":"#fff1cc", "--e":"#e7dcff" } },
  { name:"雾蓝", vars: { "--bg0":"#f7fbff", "--bg1":"#fff8f1", "--a":"#ffe2ec", "--b":"#cde3ff", "--c":"#def7f0", "--d":"#fff0d7", "--e":"#e9e1ff" } },
  { name:"香槟", vars: { "--bg0":"#fffaf3", "--bg1":"#f7fbff", "--a":"#ffd8e8", "--b":"#d7eaff", "--c":"#e3f7ee", "--d":"#fff3cf", "--e":"#efe7ff" } }
];
let themeIdx = 0;
function applyTheme(idx){
  themeIdx = (idx + themes.length) % themes.length;
  const t = themes[themeIdx];
  Object.entries(t.vars).forEach(([k,v])=> document.documentElement.style.setProperty(k,v));
  $("#themeBtn span:last-child").textContent = `柔光主题·${t.name}`;
}

async function sharePage(){
  const url = location.href;
  const data = { title: "生日快乐 · 小雨", text: "把这份祝福，轻轻交到你手上。", url };
  if(navigator.share){
    try{ await navigator.share(data); return; }catch{}
  }
  await navigator.clipboard.writeText(url);
}

function mountNav(){
  $("#brandBtn")?.addEventListener("click", ()=> scrollToId("top"));
  $("#toTopBtn")?.addEventListener("click", ()=> scrollToId("top"));
  $("#scrollBtn")?.addEventListener("click", ()=> $("#letterSection")?.scrollIntoView({behavior: reducedMotion ? "auto":"smooth"}));

  $("#themeBtn")?.addEventListener("click", ()=> applyTheme(themeIdx+1));
  $("#shareBtn")?.addEventListener("click", sharePage);

  // 点击音乐按钮：直接在手势里解锁&播放
  $("#musicBtn")?.addEventListener("click", toggleAudio);

  // 声音浮层点击：解锁&播放
  $("#soundGate")?.addEventListener("click", unlockAndPlayFromGesture);
}

/* -----------------------------
   SW：让第二次打开明显变快
------------------------------ */
function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(()=>{});
}

/* -----------------------------
   init：把重活尽量后移
------------------------------ */
function init(){
  applyTheme(0);
  mountSpotlight();
  mountNav();
  bindLetter();
  bindPast();
  mountWhispers();
  drawViz();
  loadTextureAfterLoad();
  mountFireworksOnDemand();
  registerSW();

  // 尽力静音 autoplay：能成就成；不成就出现“轻触开启声音”
  tryMutedAutoplay();

  // hero load 后再启动花瓣（移动端更明显）
  const hero = $("#heroImg");
  if(hero){
    hero.addEventListener("load", ()=> runIdle(()=> startPetals(), 1500), { once:true });
  }else{
    runIdle(()=> startPetals(), 1500);
  }

  // 星图延后（不抢首屏）
  window.addEventListener("load", ()=> runIdle(()=> mountStars(), 1600), { once:true });
}

document.addEventListener("DOMContentLoaded", init);
