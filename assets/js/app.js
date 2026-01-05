const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile =
  window.matchMedia("(max-width: 820px)").matches ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// ⭐ 关键：移动端 cap DPR，避免高分屏 canvas 过重
const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.6);

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
    setTimeout(fn, 140);
  }
}

/* -----------------------------
   Theme cycle
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
   Audio (adaptive load)
------------------------------ */
let audioReady = false;
let audioPlaying = false;
let unlocked = false;

let audioCtx = null;
let analyser = null;
let sourceNode = null;

function shouldPreloadAudio(){
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if(!c) return true;
  if(c.saveData) return false;
  if(typeof c.effectiveType === "string" && /(^|-)2g|slow-2g/i.test(c.effectiveType)) return false;
  return true;
}

function primeAudio(){
  const audio = $("#bgm");
  if(!audio) return;
  if(audio.src) return;
  const src = audio.dataset.src;
  if(!src) return;
  audio.src = src;
  audio.load();
}

function setupAudioGraph(){
  if(audioReady) return;
  const audio = $("#bgm");
  if(!audio || !audio.src) return; // 还没装载就不建图
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  sourceNode = audioCtx.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
  audioReady = true;
}

async function tryAutoPlayMuted(){
  const audio = $("#bgm");
  try{
    audio.muted = true;
    audio.volume = 0.0;
    const p = audio.play();
    if(p && typeof p.then === "function") await p;
    audioPlaying = true;
    $("#musicIcon").textContent = "Ⅱ";
    $("#musicText").textContent = "已播放";
  }catch{
    audioPlaying = false;
    $("#musicIcon").textContent = "♪";
    $("#musicText").textContent = "轻音乐";
  }
}

function fadeVolumeTo(target, ms=900){
  const audio = $("#bgm");
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

async function unlockAudioOnce(){
  if(unlocked) return;
  unlocked = true;

  primeAudio();
  setupAudioGraph();

  const audio = $("#bgm");
  try{
    if(audioCtx && audioCtx.state === "suspended") await audioCtx.resume();

    if(!audioPlaying){
      const p = audio.play();
      if(p && typeof p.then === "function") await p;
      audioPlaying = true;
      $("#musicIcon").textContent = "Ⅱ";
      $("#musicText").textContent = "已播放";
    }

    audio.muted = false;
    fadeVolumeTo(0.55, 950);
    $("#musicBtn").classList.remove("pulse");
  }catch{}
}

async function toggleAudio(){
  const audio = $("#bgm");
  try{
    await unlockAudioOnce();
    if(audioPlaying){
      audio.pause();
      audioPlaying = false;
      $("#musicIcon").textContent = "♪";
      $("#musicText").textContent = "轻音乐";
      $("#musicBtn").classList.add("pulse");
    }else{
      const p = audio.play();
      if(p && typeof p.then === "function") await p;
      audioPlaying = true;
      audio.muted = false;
      fadeVolumeTo(0.55, 650);
      $("#musicIcon").textContent = "Ⅱ";
      $("#musicText").textContent = "已播放";
      $("#musicBtn").classList.remove("pulse");
    }
  }catch{}
}

/* Visualizer */
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
   Petals background (lighter on mobile)
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

  const N = reducedMotion ? 8 : (isMobile ? 14 : 22);
  const petals = Array.from({length:N}).map(()=> spawn());

  function spawn(){
    const w = canvas.width, h = canvas.height;
    return {
      x: Math.random()*w,
      y: Math.random()*h,
      s: (isMobile ? 0.16 : 0.18) + Math.random()*(isMobile ? 0.26 : 0.30),
      r: Math.random()*Math.PI*2,
      vr: (-0.004 + Math.random()*0.008),
      vx: (0.05 + Math.random()*(isMobile ? 0.12 : 0.16)) * DPR,
      vy: (0.18 + Math.random()*(isMobile ? 0.34 : 0.46)) * DPR,
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
        const base = isMobile ? 190 : 220;
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
  const dlg = $("#letterDlg");
  dlg?.showModal();
}
function bindLetter(){
  $("#openLetterBtn")?.addEventListener("click", openLetter);
  $("#envelope")?.addEventListener("click", openLetter);
  $("#copyLetterBtn")?.addEventListener("click", async ()=>{
    const text = $$("#letterBody p").map(p=>p.textContent.trim()).join("\n");
    await navigator.clipboard.writeText(text);
  });
}

/* -----------------------------
   Past dialog
------------------------------ */
function bindPast(){
  $("#pastBtn")?.addEventListener("click", ()=>{
    $("#pastDlg")?.showModal();
  });
}

/* -----------------------------
   Whispers + generator
------------------------------ */
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
    const t = qEl.textContent.trim();
    await navigator.clipboard.writeText(t);
  });

  const active = new Set();
  $$(".chipBtn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.dataset.k;
      if(active.has(k)){
        active.delete(k);
        btn.classList.remove("active");
      }else{
        active.add(k);
        btn.classList.add("active");
      }
    });
  });

  $("#composeBtn")?.addEventListener("click", ()=>{
    const keys = [...active];
    const out = $("#composerOut");
    out.textContent = composeLine(keys);
  });
}

function composeLine(keys){
  const head = rand([
    "愿你在新的一岁里",
    "愿你把日子过得更轻盈一些",
    "愿你一直被温柔照亮",
    "愿你心里始终有光"
  ]);

  const midMap = {
    "明亮":"更明亮",
    "自由":"更自由",
    "浪漫":"更浪漫",
    "从容":"更从容",
    "好运":"更好运"
  };

  const mid = keys.length
    ? ("也愿你 " + keys.map(k=>midMap[k]||k).join("、") + "。")
    : "也愿你更笃定、更自在。";

  const tail = rand([
    "不必很用力，也能被世界认真喜欢。",
    "把热爱留给自己，把答案交给时间。",
    "你走到哪里，哪里就有好风景。",
    "所有美好，都在路上向你靠近。",
    "愿你常明，也愿你有松风作伴。"
  ]);

  return `${head}，${mid}${tail}`;
}

/* -----------------------------
   Stars canvas
------------------------------ */
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

  function star(ctx, x, y, innerR, outerR, points){
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

    for(const p of pts) star(ctx, p.x, p.y, 5*DPR, 12*DPR, 5);

    if(last && !reducedMotion){
      ctx.globalAlpha = 0.32;
      star(ctx, last.x, last.y, 4*DPR, 9*DPR, 5);
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
    const p = getPos(ev);
    pts.push({x:p.x, y:p.y});
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
   Share
------------------------------ */
async function sharePage(){
  const url = location.href;
  const data = { title: "生日快乐 · 小雨", text: "把这份祝福，轻轻交到你手上。", url };
  if(navigator.share){
    try{ await navigator.share(data); return; }catch{}
  }
  await navigator.clipboard.writeText(url);
}

/* -----------------------------
   Nav bindings
------------------------------ */
function mountNav(){
  $("#brandBtn")?.addEventListener("click", ()=> scrollToId("top"));
  $("#toTopBtn")?.addEventListener("click", ()=> scrollToId("top"));
  $("#scrollBtn")?.addEventListener("click", ()=>{
    const first = document.getElementById("letterSection");
    first?.scrollIntoView({behavior: reducedMotion ? "auto":"smooth"});
  });

  $("#themeBtn")?.addEventListener("click", ()=> applyTheme(themeIdx+1));
  $("#musicBtn")?.addEventListener("click", toggleAudio);
  $("#shareBtn")?.addEventListener("click", sharePage);
}

/* -----------------------------
   Silent unlock for audio
------------------------------ */
function mountSilentUnlock(){
  const handler = async ()=>{
    await unlockAudioOnce();
    window.removeEventListener("pointerdown", handler, true);
    window.removeEventListener("keydown", handler, true);
  };
  window.addEventListener("pointerdown", handler, true);
  window.addEventListener("keydown", handler, true);
}

/* -----------------------------
   Fireworks Engine (GLOBAL CANVAS)
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

    this.fade = reducedMotion ? 0.22 : (isMobile ? 0.18 : 0.14);
    this.startedOnce = false;
    this.sprite = this._makeSprite();

    this._fit();
    window.addEventListener("resize", ()=> this._fit(), { passive:true });
  }

  _fit(){
    const w = Math.floor(window.innerWidth * this.dpr);
    const h = Math.floor(window.innerHeight * this.dpr);
    this.c.width = w;
    this.c.height = h;
  }

  _makeSprite(){
    const s = document.createElement("canvas");
    const size = 88;
    s.width = size; s.height = size;
    const g = s.getContext("2d");
    const cx = size/2, cy = size/2;
    const grad = g.createRadialGradient(cx,cy,0,cx,cy,size/2);
    grad.addColorStop(0.00, "rgba(255,255,255,1)");
    grad.addColorStop(0.22, "rgba(255,255,255,.95)");
    grad.addColorStop(0.50, "rgba(255,255,255,.26)");
    grad.addColorStop(1.00, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx,cy,size/2,0,Math.PI*2);
    g.fill();
    return s;
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

  ignite(show=1){
    const n = reducedMotion ? 2 : (isMobile ? 3 : 5);
    let count = 0;
    const tick = ()=>{
      this.launch();
      count++;
      if(count < n*show) setTimeout(tick, 420 + Math.random()*240);
    };
    tick();
    this._ensureRun();
  }

  launch(){
    const w = this.c.width, h = this.c.height;
    const x = (0.18 + Math.random()*0.64) * w;
    const y = h + 30*this.dpr;
    const vx = (Math.random()*2-1) * 0.55 * this.dpr;
    const vy = (- (8.2 + Math.random()*2.6)) * this.dpr;
    const col = this._palette();
    this.rockets.push({
      x,y,vx,vy,
      ax: (Math.random()*2-1) * 0.008 * this.dpr,
      life: 0,
      fuse: 50 + Math.random()*24,
      col
    });
  }

  burst(x,y){
    const col = this._palette();
    const coreN  = reducedMotion ? 50 : (isMobile ? 90 : 140);
    const ringN  = reducedMotion ? 18 : (isMobile ? 28 : 44);
    const willowN= reducedMotion ? 14 : (isMobile ? 18 : 34);

    for(let i=0;i<coreN;i++){
      const a = Math.random()*Math.PI*2;
      const sp = (2.0 + Math.random()*4.6) * this.dpr;
      this.parts.push(this._mkParticle(x,y,Math.cos(a)*sp,Math.sin(a)*sp,col, 52 + Math.random()*24, 0.985));
    }
    for(let i=0;i<ringN;i++){
      const a = (i/ringN)*Math.PI*2 + Math.random()*0.12;
      const sp = (5.2 + Math.random()*1.5) * this.dpr;
      const c2 = this._tint(col, 1.08);
      this.parts.push(this._mkParticle(x,y,Math.cos(a)*sp,Math.sin(a)*sp,c2, 40 + Math.random()*16, 0.988, 0.92));
    }
    for(let i=0;i<willowN;i++){
      const a = Math.random()*Math.PI*2;
      const sp = (1.5 + Math.random()*2.2) * this.dpr;
      const c3 = this._tint(col, 0.92);
      this.parts.push(this._mkParticle(x,y,Math.cos(a)*sp,Math.sin(a)*sp - (1.1*this.dpr),c3, 84 + Math.random()*38, 0.992, 0.55, true));
    }

    // ⭐ 移动端减少丝带（更稳）
    if(!reducedMotion && !isMobile){
      const rCount = 2 + Math.floor(Math.random()*2);
      for(let i=0;i<rCount;i++){
        this.ribbons.push(this._mkRibbon(x,y,col));
      }
    }

    this.parts.push({ kind:"flash", x,y, life:0, ttl: 10, r: 40*this.dpr, a: 0.9 });
  }

  _tint([r,g,b], k){
    return [clamp(r*k,0,255), clamp(g*k,0,255), clamp(b*k,0,255)];
  }

  _mkParticle(x,y,vx,vy,col,ttl,drag=0.988, alpha=0.78, isWillow=false){
    return {
      kind:"p",
      x,y,vx,vy,
      px:x,py:y,
      life:0, ttl,
      drag,
      g: (0.11 + Math.random()*0.06) * this.dpr,
      col,
      a: alpha,
      s: (0.55 + Math.random()*0.75) * this.dpr,
      flick: 0.85 + Math.random()*0.30,
      willow: isWillow,
      tw: Math.random()*Math.PI*2
    };
  }

  _mkRibbon(x,y,col){
    const segs = 28 + Math.floor(Math.random()*14);
    const amp  = (10 + Math.random()*16) * this.dpr;
    const len  = (200 + Math.random()*140) * this.dpr;
    const rot  = Math.random()*Math.PI*2;
    const w = (1.6 + Math.random()*1.0) * this.dpr;

    return {
      kind:"r",
      x,y,
      col,
      segs,
      amp,
      len,
      rot,
      w,
      life:0,
      ttl: 80 + Math.random()*26,
      ph: Math.random()*Math.PI*2,
      drift: (Math.random()*2-1) * 0.32 * this.dpr
    };
  }

  _ensureRun(){
    if(this.running) return;
    this.running = true;
    this.lastT = performance.now();
    requestAnimationFrame((t)=> this._frame(t));
  }

  _frame(t){
    const dt = clamp((t - this.lastT)/16.666, 0.6, 2.2);
    this.lastT = t;

    const ctx = this.ctx;
    const w = this.c.width, h = this.c.height;

    // transparent long-exposure fade
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

      if(!reducedMotion && !isMobile && Math.random() < 0.50){
        const c = this._tint(r.col, 1.05);
        this.parts.push(this._mkParticle(r.x, r.y,
          (Math.random()*2-1)*0.6*this.dpr,
          (Math.random()*2-1)*0.6*this.dpr,
          c, 24+Math.random()*14, 0.92, 0.28));
      }

      ctx.globalCompositeOperation = "lighter";
      this._drawGlow(r.x, r.y, r.col, 0.85, 1.35*this.dpr);

      if(r.life > r.fuse || r.vy > -1.5*this.dpr){
        this.burst(r.x, r.y);
        this.rockets.splice(i,1);
      }
    }

    // ribbons
    for(let i=this.ribbons.length-1;i>=0;i--){
      const rb = this.ribbons[i];
      rb.life += dt;
      const k = rb.life / rb.ttl;
      if(k >= 1){ this.ribbons.splice(i,1); continue; }
      rb.y += (0.18*this.dpr + k*0.28*this.dpr) * dt;
      rb.x += rb.drift * dt;
      rb.ph += 0.06 * dt;
      this._drawRibbon(rb, 1 - k);
    }

    // particles
    for(let i=this.parts.length-1;i>=0;i--){
      const p = this.parts[i];
      p.life += dt;
      const k = p.life / p.ttl;
      if(k >= 1){ this.parts.splice(i,1); continue; }

      if(p.kind === "flash"){
        ctx.globalCompositeOperation = "lighter";
        const a = (1-k) * p.a;
        this._drawFlash(p.x,p.y,p.r*(1+0.25*k), a);
        continue;
      }

      p.px = p.x; p.py = p.y;
      p.vx *= Math.pow(p.drag, dt);
      p.vy *= Math.pow(p.drag, dt);
      p.vy += p.g * dt;

      if(p.willow && !reducedMotion && !isMobile){
        p.tw += 0.08*dt;
        p.vx += Math.sin(p.tw) * 0.02 * this.dpr;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const a = p.a * (1-k);
      ctx.globalCompositeOperation = "lighter";
      const flick = (0.75 + 0.25*Math.sin((t/1000)*8 + i*0.7)) * p.flick;
      this._drawTrail(p.px,p.py,p.x,p.y,p.col, a*0.55*flick, p.s*0.70);
      this._drawGlow(p.x,p.y,p.col, a*flick, p.s);
    }

    const idle = this.rockets.length===0 && this.parts.length===0 && this.ribbons.length===0;
    if(idle){
      this.running = false;
      return;
    }
    requestAnimationFrame((tt)=> this._frame(tt));
  }

  _rgba([r,g,b], a){
    return `rgba(${r|0},${g|0},${b|0},${a})`;
  }

  _drawGlow(x,y,col,a,sz){
    const ctx = this.ctx;
    const s = this.sprite;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x,y);

    const halo = sz*32;
    ctx.fillStyle = this._rgba(col, 0.10*a);
    ctx.beginPath();
    ctx.arc(0,0,halo,0,Math.PI*2);
    ctx.fill();

    const k = sz*22;
    ctx.drawImage(s, -k/2, -k/2, k, k);
    ctx.restore();
  }

  _drawTrail(x0,y0,x1,y1,col,a,w){
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = this._rgba(col, 0.55);
    ctx.lineWidth = Math.max(1.2*this.dpr, 3*w);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0,y0);
    ctx.lineTo(x1,y1);
    ctx.stroke();

    ctx.globalAlpha = a*0.82;
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = Math.max(0.9*this.dpr, 1.6*w);
    ctx.beginPath();
    ctx.moveTo(x0,y0);
    ctx.lineTo(x1,y1);
    ctx.stroke();
    ctx.restore();
  }

  _drawFlash(x,y,r,a){
    const ctx = this.ctx;
    ctx.save();
    const g = ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0, `rgba(255,255,255,${0.85*a})`);
    g.addColorStop(0.35, `rgba(255,255,255,${0.18*a})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  _drawRibbon(rb, a){
    const ctx = this.ctx;
    const {x,y,segs,amp,len,rot,w,col} = rb;

    const pts = [];
    for(let i=0;i<=segs;i++){
      const t = i/segs;
      const u = t*len;
      const wave = Math.sin(rb.ph + t*6.2) * amp * (0.85 - 0.55*t);
      const xx = x + Math.cos(rot)*u - Math.sin(rot)*wave;
      const yy = y + Math.sin(rot)*u + Math.cos(rot)*wave;
      pts.push([xx,yy]);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    ctx.globalAlpha = 0.18*a;
    ctx.strokeStyle = this._rgba(col, 0.55);
    ctx.lineWidth = (w*7.0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.stroke();

    ctx.globalAlpha = 0.42*a;
    ctx.strokeStyle = this._rgba(col, 0.72);
    ctx.lineWidth = (w*3.0);
    ctx.beginPath();
    ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.stroke();

    ctx.globalAlpha = 0.38*a;
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = (w*1.12);
    ctx.beginPath();
    ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.stroke();

    ctx.restore();
  }
}

let fw = null;
function mountFireworks(){
  const c = $("#fireworksGlobal");
  if(!c) return;
  fw = new FireworksEngine(c);

  $("#igniteBtn")?.addEventListener("click", ()=> fw.ignite(1));
  $("#igniteMoreBtn")?.addEventListener("click", ()=> fw.ignite(2));

  const sec = $("#fireworksSection");
  if(!sec) return;

  const obs = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting && !fw.startedOnce){
        fw.startedOnce = true;
        fw.ignite(2);
      }
    }
  }, { threshold: 0.35 });
  obs.observe(sec);
}

/* -----------------------------
   Birthday sparkle (only on the day)
------------------------------ */
function birthdaySparkle(){
  const today = new Date().toISOString().slice(0,10);
  if(today !== CONFIG.dateISO) return;
  if(reducedMotion) return;

  const n = isMobile ? 10 : 18;
  for(let i=0;i<n;i++){
    const d = document.createElement("div");
    d.style.position="fixed";
    d.style.left = Math.random()*100 + "vw";
    d.style.top = "-12px";
    const s = 4 + Math.random()*6;
    d.style.width = s+"px";
    d.style.height = s+"px";
    d.style.borderRadius = "999px";
    d.style.background = ["rgba(255,214,232,.92)","rgba(207,232,255,.92)","rgba(223,246,234,.92)","rgba(255,241,204,.92)"][Math.floor(Math.random()*4)];
    d.style.boxShadow = "0 10px 30px rgba(0,0,0,.10)";
    d.style.zIndex="30";
    d.style.opacity=".0";
    d.style.transition="opacity .6s ease";
    document.body.appendChild(d);
    requestAnimationFrame(()=> d.style.opacity=".95");

    const v = 0.8 + Math.random()*1.6;
    const drift = (Math.random()*2-1)*0.08;
    let top = -12;

    function step(){
      top += v;
      d.style.top = top + "px";
      const left = parseFloat(d.style.left);
      d.style.left = (left + drift) + "vw";
      if(top > innerHeight + 40) d.remove();
      else requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
}

/* -----------------------------
   Init
------------------------------ */
function init(){
  applyTheme(0);
  mountSpotlight();
  mountNav();
  bindLetter();
  bindPast();
  mountWhispers();

  // 音频：快网可提前装载并尝试静音自动播放
  if(shouldPreloadAudio()){
    primeAudio();
    setupAudioGraph();
    tryAutoPlayMuted();
  }else{
    // 慢网/省流量：不抢首屏
    $("#musicIcon").textContent = "♪";
    $("#musicText").textContent = "轻音乐";
  }

  mountSilentUnlock();
  drawViz();

  // 重活延后：保证手机首屏先出来
  runIdle(()=> startPetals(), 1200);
  runIdle(()=> mountStars(), 1200);
  runIdle(()=> mountFireworks(), 1400);

  birthdaySparkle();
}

document.addEventListener("DOMContentLoaded", init);
