/* ============================================================
   小霸王 · 其乐无穷 — boot sequence
   512 × 384 的逻辑分辨率，全部用 Canvas 2D 画出来。
   ============================================================ */
(() => {
  'use strict';

  const W = 512;
  const H = 384;
  const FONT = '"XBW Pixel", monospace';

  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d', { alpha: false });
  const gate = document.getElementById('gate');
  const audioNote = document.getElementById('audioNote');
  const muteLabel = document.getElementById('muteLabel');

  ctx.imageSmoothingEnabled = false;

  // 离屏场景层：方便整体做开机缩放 / 抖动 / 淡入
  const sceneCanvas = document.createElement('canvas');
  sceneCanvas.width = W;
  sceneCanvas.height = H;
  const sceneCtx = sceneCanvas.getContext('2d');
  sceneCtx.imageSmoothingEnabled = false;

  /* ------------------------------------------------------------
     参数
     ------------------------------------------------------------ */
  const qs = new URLSearchParams(location.search);
  const seekRaw = qs.get('t');
  const SEEK =
    seekRaw !== null && seekRaw !== '' && Number.isFinite(parseFloat(seekRaw))
      ? Math.max(0, parseFloat(seekRaw))
      : null;
  const AUTO = qs.get('auto') === '1';
  const LOOP = qs.get('loop') === '1';
  const ATTRACT = document.body.dataset.attract === '1' || qs.get('attract') === '1';
  const GATE = qs.get('gate') === '1';
  const EMBED = qs.get('embed') === '1';
  const NEXT = qs.get('next') || 'http://127.0.0.1:62309';

  /* 时间轴（秒） */
  const T = {
    line: 0.10,
    lineEnd: 0.34,
    expand: 0.34,
    expandEnd: 0.62,
    screen: 0.52,
    screenEnd: 0.90,

    av: 0.72,
    avEnd: 1.55,

    mascot: 1.14,
    fu: 1.34,
    le: 1.50,

    title: [1.70, 1.87, 2.04],

    sub: 2.26,
    subStep: 0.032,

    voice: 3.10,
    attract: 6.70
  };

  /* 人声里“其 / 乐 / 无 / 穷”的起点（相对人声开始） */
  const SLOGAN_AT = [1.30, 1.60, 2.10, 2.60].map((v) => v + T.voice);

  const SUBTITLE = 'DeepSeek Harness';
  const SLOGAN = '其乐无穷';
  const END = 12.0;

  /* ------------------------------------------------------------
     小工具
     ------------------------------------------------------------ */
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  function ring(r) {
    const set = new Set();
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      set.add(`${Math.round(Math.cos(a) * r)},${Math.round(Math.sin(a) * r)}`);
    }
    return [...set].map((s) => s.split(',').map(Number));
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return { c, g };
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* ------------------------------------------------------------
     精灵
     ------------------------------------------------------------ */
  const sprites = {
    title: [],
    sub: [],
    slogan: [],
    fu: null,
    le: null,
    mascot: null,
    noise: [],
    games: []
  };

  function makeTitle(ch) {
    const S = 280;
    const cx = 140;
    const cy = 150;
    const { c, g } = makeCanvas(S, S);
    g.font = `84px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.imageSmoothingEnabled = false;

    // 冷色外发光
    g.save();
    g.shadowColor = 'rgba(42, 96, 255, 0.9)';
    g.shadowBlur = 42;
    g.fillStyle = 'rgba(18, 48, 170, 0.6)';
    g.fillText(ch, cx, cy);
    g.restore();

    // 深色厚描边（顺便加粗）
    g.fillStyle = '#52000e';
    for (const [ox, oy] of ring(2)) g.fillText(ch, cx + ox, cy + oy);

    // 红色立体影
    g.fillStyle = '#c1121f';
    for (const [ox, oy] of ring(1)) g.fillText(ch, cx + 4 + ox, cy + 5 + oy);

    // 主体：奶白 → 明黄 → 橙
    const grad = g.createLinearGradient(0, cy - 44, 0, cy + 44);
    grad.addColorStop(0, '#fffbe6');
    grad.addColorStop(0.26, '#ffe45c');
    grad.addColorStop(0.62, '#ffc11b');
    grad.addColorStop(1, '#ff8a00');
    g.fillStyle = grad;
    g.fillText(ch, cx, cy);

    // 顶部高光
    g.save();
    g.beginPath();
    g.rect(0, 0, S, cy - 4);
    g.clip();
    const hl = g.createLinearGradient(0, cy - 42, 0, cy - 4);
    hl.addColorStop(0, 'rgba(255,255,255,0.55)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl;
    g.fillText(ch, cx - 1, cy - 4);
    g.restore();

    return c;
  }

  function makeSubtitleLine(text) {
    const size = 24;
    const pad = 20;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = `${size}px ${FONT}`;
    const total = Math.ceil(probe.measureText(text).width);
    const widths = [];
    for (let i = 1; i <= text.length; i++) {
      widths.push(probe.measureText(text.slice(0, i)).width);
    }

    const { c, g } = makeCanvas(Math.ceil(total) + pad * 2, 60);
    g.font = `${size}px ${FONT}`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';

    g.save();
    g.shadowColor = 'rgba(54, 205, 255, 0.95)';
    g.shadowBlur = 15;
    g.fillStyle = '#eafcff';
    g.fillText(text, pad, 31);
    g.restore();

    g.fillStyle = '#062a5e';
    for (const [ox, oy] of ring(1)) g.fillText(text, pad + ox, 31 + oy);

    g.fillStyle = '#f6feff';
    g.fillText(text, pad, 31);

    return { c, total, widths, pad };
  }

  function makeSlogan(ch) {
    const S = 64;
    const cx = 32;
    const cy = 34;
    const { c, g } = makeCanvas(S, S);
    g.font = `36px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    g.save();
    g.shadowColor = 'rgba(255, 64, 44, 0.9)';
    g.shadowBlur = 20;
    g.fillStyle = '#ff5a44';
    g.fillText(ch, cx, cy);
    g.restore();

    g.fillStyle = '#3a0004';
    for (const [ox, oy] of ring(2)) g.fillText(ch, cx + ox, cy + oy);

    const grad = g.createLinearGradient(0, cy - 18, 0, cy + 18);
    grad.addColorStop(0, '#fff3c4');
    grad.addColorStop(0.45, '#ff8a5c');
    grad.addColorStop(1, '#ff2f24');
    g.fillStyle = grad;
    g.fillText(ch, cx, cy);
    return c;
  }

  function makeWord(text) {
    const { c, g } = makeCanvas(104, 52);
    g.font = `24px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.letterSpacing = '7px';

    g.save();
    g.shadowColor = 'rgba(40, 205, 105, 0.6)';
    g.shadowBlur = 14;
    g.fillStyle = '#3fd873';
    g.fillText(text, 52, 27);
    g.restore();

    g.fillStyle = '#043d1c';
    for (const [ox, oy] of ring(1)) g.fillText(text, 52 + ox, 27 + oy);

    g.fillStyle = '#57e888';
    g.fillText(text, 52, 27);
    return c;
  }

  function quantize(source, palette) {
    const g = source.getContext('2d');
    const img = g.getImageData(0, 0, source.width, source.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 110) {
        d[i + 3] = 0;
        continue;
      }
      let best = 0;
      let bestD = Infinity;
      for (let p = 0; p < palette.length; p++) {
        const dr = d[i] - palette[p][0];
        const dg = d[i + 1] - palette[p][1];
        const db = d[i + 2] - palette[p][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestD) {
          bestD = dist;
          best = p;
        }
      }
      d[i] = palette[best][0];
      d[i + 1] = palette[best][1];
      d[i + 2] = palette[best][2];
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return source;
  }

  function makeMascot() {
    const N = 64;
    const { c, g } = makeCanvas(N, N);
    const blob = (scale) => {
      const parts = [
        [23, 15, 11],
        [41, 15, 11],
        [32, 18, 13],
        [12, 35, 10],
        [52, 35, 10],
        [32, 32, 16]
      ];
      for (const [x, y, r] of parts) {
        g.beginPath();
        g.arc(x, y, r * scale, 0, Math.PI * 2);
        g.fill();
      }
    };

    // 深红轮廓
    g.fillStyle = '#5a0912';
    blob(1.12);

    // 红色花瓣
    g.fillStyle = '#e11f2b';
    blob(1.0);

    // 下半部压暗
    g.save();
    g.beginPath();
    g.rect(0, 42, N, 22);
    g.clip();
    g.fillStyle = '#b3121c';
    blob(1.0);
    g.restore();

    // 发丝高光
    g.strokeStyle = '#ff8a93';
    g.lineWidth = 1.2;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(22, 16, 8, Math.PI * 1.02, Math.PI * 1.5);
    g.stroke();
    g.beginPath();
    g.arc(42, 16, 8, Math.PI * 1.5, Math.PI * 1.98);
    g.stroke();

    // 蓝色小领子（会被脸压住一点）
    g.fillStyle = '#1b3fd0';
    g.strokeStyle = '#ff9a2e';
    g.lineWidth = 1.4;
    roundRect(g, 16, 47, 32, 9, 4);
    g.fill();
    g.stroke();

    // 蓝色的脸
    g.fillStyle = '#63cdf7';
    g.beginPath();
    g.arc(32, 37, 13.5, 0, Math.PI * 2);
    g.fill();
    // 头顶花瓣边
    g.beginPath();
    g.arc(24, 28, 4.4, 0, Math.PI * 2);
    g.arc(40, 28, 4.4, 0, Math.PI * 2);
    g.arc(32, 26, 4.4, 0, Math.PI * 2);
    g.fill();

    // 亮面
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.beginPath();
    g.arc(27, 31, 6, 0, Math.PI * 2);
    g.fill();

    // 笑眼（画在红发上）
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.7;
    g.beginPath();
    g.arc(24, 20.5, 3.2, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
    g.beginPath();
    g.arc(40, 20.5, 3.2, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();

    // 鼻尖小星
    g.fillStyle = '#ffffff';
    g.fillRect(31, 15, 2, 6);
    g.fillRect(29, 17, 6, 2);

    // 脸上那圈很小的字
    g.fillStyle = '#e8484f';
    g.font = `6px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('小霸王', 32, 41);

    return quantize(c, [
      [90, 9, 18],
      [225, 31, 43],
      [179, 18, 28],
      [255, 138, 147],
      [99, 205, 247],
      [175, 235, 255],
      [255, 255, 255],
      [27, 63, 208],
      [255, 154, 46],
      [232, 72, 79],
      [10, 18, 46]
    ]);
  }

  function makeNoise() {
    const { c, g } = makeCanvas(W, H);
    const img = g.createImageData(W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  const GAME_FILES = [
    'contra.jpg', 'mario.jpg', 'tank.jpg', 'adventure.jpg', 'jackal.jpg',
    'greenberet.jpg', 'salamander.jpg', 'doubledragon.jpg', 'ninja.jpg', 'kage.jpg',
    'circus.jpg', 'pacman.jpg', 'galaga.jpg', 'tetris.jpg', 'bomberman.jpg',
    'excitebike.jpg', 'arkanoid.jpg', 'tennis.jpg', 'macross.jpg', 'tmnt.jpg'
  ];

  function loadGameImages() {
    return Promise.all(GAME_FILES.map((f) => new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = 'assets/games/' + f;
      setTimeout(() => res(null), 2000);
    })));
  }

  function buildSprites(gameImgs) {
    sprites.title = [...'小霸王'].map(makeTitle);
    sprites.sub = makeSubtitleLine(SUBTITLE);
    sprites.slogan = [...SLOGAN].map(makeSlogan);
    sprites.fu = makeWord('深度');
    sprites.le = makeWord('求索');
    sprites.mascot = makeMascot();
    sprites.noise = [makeNoise(), makeNoise(), makeNoise()];
    if (ATTRACT) {
      const drawn = [
        sceneJungle(), sceneTank(), scenePlatform(), sceneSpace(),
        scenePong(), sceneTetris(), scenePac(), sceneInvaders(),
        sceneFighter(), sceneRacing(), sceneBomber(), sceneNinja(),
        sceneUnderwater(), sceneMotocross(),
        sceneArkanoid(), sceneBeat(), sceneCircus(), sceneTennis()
      ];
      const imgs = gameImgs || [];
      sprites.games = imgs.some(Boolean)
        ? imgs.map((im, i) => im || drawn[i % drawn.length])
        : drawn;
      buildWallGrid();
    }
  }

  /* ------------------------------------------------------------
     画面
     ------------------------------------------------------------ */
  function drawStandby() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (sprites.noise.length) {
      ctx.globalAlpha = 0.02;
      ctx.drawImage(sprites.noise[0], 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  function drawPower(t) {
    if (t < T.line) return;

    if (t < T.lineEnd) {
      const p = easeOutCubic((t - T.line) / (T.lineEnd - T.line));
      const w = W * p;
      ctx.save();
      ctx.shadowColor = '#c9ecff';
      ctx.shadowBlur = 26;
      ctx.fillStyle = '#f2fbff';
      ctx.fillRect(W / 2 - w / 2, H / 2 - 1.5, w, 3);
      ctx.restore();
      return;
    }

    if (t < T.expandEnd) {
      const p = clamp((t - T.lineEnd) / (T.expandEnd - T.lineEnd));
      const e = easeOutCubic(p);
      const h = H * e;
      ctx.fillStyle = `rgba(233, 248, 255, ${0.96 - 0.3 * e})`;
      ctx.fillRect(0, H / 2 - h / 2, W, h);
      ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - p)})`;
      ctx.fillRect(0, H / 2 - h / 2 - 1, W, 2);
      ctx.fillRect(0, H / 2 + h / 2 - 1, W, 2);
    }
  }

  function drawPowerFlash(t) {
    const d = t - 0.30;
    if (d < 0 || d > 0.18) return;
    const a = 0.32 * Math.exp(-d / 0.045);
    ctx.fillStyle = `rgba(235, 250, 255, ${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawScene(g, t) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);

    // 深蓝底
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#04071f');
    bg.addColorStop(0.55, '#071039');
    bg.addColorStop(1, '#02030e');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);

    // 中央荧光
    const rg = g.createRadialGradient(256, 176, 8, 256, 176, 300);
    rg.addColorStop(0, 'rgba(30, 78, 224, 0.62)');
    rg.addColorStop(0.42, 'rgba(15, 42, 148, 0.34)');
    rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);

    drawAV(g, t);
    drawMascot(g, t);
    drawEveryday(g, t);
    drawTitleText(g, t);
    drawSubText(g, t);
    drawSloganText(g, t);
  }

  function drawAV(g, t) {
    const a =
      smoothstep(T.av, T.av + 0.12, t) * (1 - smoothstep(T.avEnd - 0.3, T.avEnd, t));
    if (a <= 0) return;

    g.save();
    g.globalAlpha = a * 0.5;
    g.fillStyle = '#7fe6ff';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(26 + i * 11, 29, 2.2, 0, Math.PI * 2);
      g.fill();
    }
    g.font = `24px ${FONT}`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText('AV', 62, 30);
    g.restore();
  }

  function drawMascot(g, t) {
    const p = clamp((t - T.mascot) / 0.32);
    if (p <= 0) return;
    const e = easeOutBack(p);
    const size = 104 * (0.55 + 0.45 * e);
    const y = 88 - 16 * (1 - easeOutCubic(p));
    const a = smoothstep(0, 0.22, p);

    g.save();
    g.globalAlpha = a * 0.55;
    const glow = g.createRadialGradient(256, y, 8, 256, y, 96);
    glow.addColorStop(0, 'rgba(120, 220, 255, 0.4)');
    glow.addColorStop(1, 'rgba(120, 220, 255, 0)');
    g.fillStyle = glow;
    g.fillRect(150, y - 100, 212, 200);
    g.restore();

    g.globalAlpha = a;
    g.drawImage(sprites.mascot, 256 - size / 2, y - size / 2, size, size);
    g.globalAlpha = 1;

    // ®
    const ra = smoothstep(0.2, 0.45, p);
    if (ra > 0) {
      g.save();
      g.globalAlpha = ra * 0.55;
      g.strokeStyle = '#c9404a';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(318, 44, 7, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#c9404a';
      g.font = `12px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('R', 318, 45);
      g.restore();
    }
  }

  function drawEveryday(g, t) {
    const words = [
      { s: sprites.fu, at: T.fu, x: 148, dir: 1 },
      { s: sprites.le, at: T.le, x: 364, dir: -1 }
    ];
    for (const w of words) {
      const p = clamp((t - w.at) / 0.3);
      if (p <= 0) continue;
      const e = easeOutCubic(p);
      g.globalAlpha = smoothstep(0, 0.5, p);
      g.drawImage(w.s, w.x - 52 + (1 - e) * 14 * w.dir, 91 - 26, 104, 52);
      g.globalAlpha = 1;
    }
  }

  function drawTitleText(g, t) {
    const xs = [162, 256, 350];
    for (let i = 0; i < 3; i++) {
      const p = clamp((t - T.title[i]) / 0.26);
      if (p <= 0) continue;
      const e = easeOutBack(p);
      const scale = 1 + 0.62 * (1 - e);
      const dy = -32 * (1 - easeOutCubic(p));
      g.save();
      g.globalAlpha = smoothstep(0, 0.18, p);
      g.translate(xs[i], 190 + dy);
      g.scale(scale, scale);
      g.drawImage(sprites.title[i], -140, -150, 280, 280);
      g.restore();
    }
  }

  function drawSubText(g, t) {
    if (t < T.sub) return;
    const line = sprites.sub;
    const n = clamp(Math.floor((t - T.sub) / T.subStep) + 1, 0, SUBTITLE.length);
    const reveal = n > 0 ? line.widths[n - 1] : 0;
    const x0 = 256 - line.total / 2;
    const sw = Math.min(line.c.width, line.pad + reveal + 3);

    g.drawImage(line.c, 0, 0, sw, 60, x0 - line.pad, 266 - 31, sw, 60);

    // 光标
    const typed = n >= SUBTITLE.length;
    const blinkOn = !typed || Math.floor(t * 3.2) % 2 === 0;
    if (blinkOn) {
      g.save();
      g.globalAlpha = typed ? 0.28 : 0.8;
      g.fillStyle = '#eaffff';
      g.fillRect(x0 + reveal + 3, 255, 8, 22);
      g.restore();
    }
  }

  function drawSloganText(g, t) {
    if (t < SLOGAN_AT[0]) return;

    const p0 = clamp((t - SLOGAN_AT[0]) / 0.35);
    const dashA = smoothstep(0, 1, p0) * 0.55;
    g.save();
    g.globalAlpha = dashA;
    g.fillStyle = '#ff4a3c';
    g.fillRect(108, 329, 62 * easeOutCubic(p0), 2);
    g.fillRect(342 + 62 * (1 - easeOutCubic(p0)), 329, 62 * easeOutCubic(p0), 2);
    g.restore();

    for (let i = 0; i < 4; i++) {
      if (t < SLOGAN_AT[i]) continue;
      const p = clamp((t - SLOGAN_AT[i]) / 0.16);
      const e = easeOutCubic(p);
      const scale = 1 + 0.9 * (1 - e);
      g.save();
      g.globalAlpha = smoothstep(0, 0.25, p);
      g.translate(194 + i * 44, 330);
      g.scale(scale, scale);
      g.drawImage(sprites.slogan[i], -32, -34, 64, 64);
      g.restore();
    }
  }

  function drawScanlines() {
    ctx.save();
    ctx.globalAlpha = 0.17;
    ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }

  function drawScanRoll(t) {
    if (t < T.screen) return;
    const y = ((t * 26) % (H + 160)) - 160;
    const grad = ctx.createLinearGradient(0, y, 0, y + 150);
    grad.addColorStop(0, 'rgba(140, 205, 255, 0)');
    grad.addColorStop(0.5, 'rgba(140, 205, 255, 0.035)');
    grad.addColorStop(1, 'rgba(140, 205, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, 150);
  }

  function noiseAmount(t) {
    if (t < 0.1) return 0.012;
    if (t < T.screen) return 0.03;
    if (t < 1.45) return 0.34 * (1 - smoothstep(0.72, 1.35, t)) + 0.026;
    return 0.026 + Math.sin(t * 41) * 0.006;
  }

  function drawNoise(a, t) {
    if (a <= 0.002 || !sprites.noise.length) return;
    const idx = ((Math.floor(t * 24) % 3) + 3) % 3;
    const tile = sprites.noise[idx];
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 0.75);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(tile, 0, 0, W, H);
    ctx.restore();
  }

  function shakeAt(t) {
    let s = 0;
    const points = [...T.title, 0.62];
    for (const p of points) {
      const d = t - p;
      if (d > 0 && d < 0.4) s += Math.sin(d * 62) * Math.exp(-d * 13) * 3;
    }
    return s;
  }

  /* ------------------------------------------------------------
     ATTREACT：开机之后，电视里放一段经典游戏跑马灯
     ------------------------------------------------------------ */
  function gameCanvas(draw) {
    const { c, g } = makeCanvas(256, 192);
    g.imageSmoothingEnabled = false;
    draw(g);
    return c;
  }

  function sceneJungle() {
    return gameCanvas((g) => {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const txt = (t, x, y, c) => { g.font = `12px ${FONT}`; g.fillStyle = c; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(t, x, y); };
      const sky = g.createLinearGradient(0, 0, 0, 192);
      sky.addColorStop(0, '#0d3b1e'); sky.addColorStop(1, '#061a0d');
      g.fillStyle = sky; g.fillRect(0, 0, 256, 192);
      for (const [x, w] of [[18, 8], [54, 6], [96, 9], [150, 7], [210, 10], [236, 6]]) R(x, 20, w, 120, '#0a2412');
      for (let i = 0; i < 26; i++) R((i * 37) % 256, (i * 23) % 50, 22, 10, '#123f22');
      R(0, 160, 256, 32, '#2a1a0a'); R(0, 160, 256, 4, '#6a4a1a');
      for (let x = 0; x < 256; x += 8) R(x, 164, 4, 4, '#3d2a12');
      for (let x = 0; x < 256; x += 16) { R(x, 156, 2, 6, '#2f7a2f'); R(x + 6, 154, 2, 8, '#2f7a2f'); }
      R(36, 126, 10, 6, '#f2c48d'); R(34, 124, 14, 3, '#c02020');
      R(38, 132, 8, 12, '#2a4ad0'); R(36, 144, 4, 10, '#141414'); R(44, 144, 4, 10, '#141414');
      R(46, 134, 14, 3, '#888'); R(58, 134, 6, 4, '#ffd040');
      for (const [x, y] of [[150, 132], [196, 118]]) {
        R(x, y, 10, 6, '#e0b080'); R(x - 2, y + 6, 14, 10, '#a02020');
        R(x - 2, y + 16, 4, 8, '#141414'); R(x + 8, y + 16, 4, 8, '#141414'); R(x + 12, y + 8, 10, 2, '#777');
      }
      for (const x of [70, 82, 94]) R(x, 128, 4, 2, '#ffe040');
      R(206, 116, 10, 10, '#ff7a00'); R(202, 120, 18, 4, '#ffd040'); R(210, 112, 4, 18, '#ffd040');
      txt('1UP  3400', 8, 8, '#fff'); txt('STAGE 1', 196, 8, '#fff');
    });
  }

  function sceneTank() {
    return gameCanvas((g) => {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const txt = (t, x, y, c) => { g.font = `12px ${FONT}`; g.fillStyle = c; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(t, x, y); };
      R(0, 0, 256, 192, '#000');
      const brick = (x, y) => { R(x, y, 16, 16, '#8a3a1a'); R(x, y, 16, 2, '#d08050'); R(x, y + 7, 16, 2, '#d08050'); R(x + 7, y, 2, 8, '#d08050'); R(x + 7, y + 8, 2, 8, '#d08050'); };
      for (let x = 16; x < 240; x += 32) for (let y = 16; y < 144; y += 32) if (((x / 32) + (y / 32)) % 3 !== 0) brick(x, y);
      R(116, 170, 24, 16, '#aaa'); R(120, 174, 16, 8, '#fff'); R(126, 176, 4, 4, '#d02020');
      R(104, 140, 20, 20, '#e0c020'); R(100, 144, 4, 12, '#666'); R(124, 144, 4, 12, '#666'); R(112, 132, 8, 10, '#e0c020'); R(114, 124, 4, 8, '#e0c020');
      for (const [x, y] of [[40, 40], [184, 40], [40, 104]]) { R(x, y, 18, 18, '#a0a0a0'); R(x - 3, y + 4, 3, 10, '#555'); R(x + 18, y + 4, 3, 10, '#555'); R(x + 7, y - 6, 4, 8, '#a0a0a0'); }
      R(114, 100, 3, 6, '#fff'); R(50, 64, 3, 6, '#fff');
      txt('STAGE 1', 8, 176, '#fff'); txt('IP 3', 226, 176, '#fff');
    });
  }

  function scenePlatform() {
    return gameCanvas((g) => {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const txt = (t, x, y, c) => { g.font = `12px ${FONT}`; g.fillStyle = c; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(t, x, y); };
      const sky = g.createLinearGradient(0, 0, 0, 160);
      sky.addColorStop(0, '#5c94fc'); sky.addColorStop(1, '#8fc0ff');
      g.fillStyle = sky; g.fillRect(0, 0, 256, 192);
      for (const [x, y] of [[26, 30], [150, 48], [210, 24]]) { R(x, y, 28, 8, '#fff'); R(x + 6, y - 6, 16, 8, '#fff'); R(x - 6, y + 4, 40, 6, '#fff'); }
      g.fillStyle = '#2a8a2a'; g.beginPath(); g.arc(60, 190, 50, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(190, 200, 70, 0, Math.PI * 2); g.fill();
      R(0, 160, 256, 32, '#b05020');
      for (let x = 0; x < 256; x += 16) { R(x, 160, 16, 2, '#e08050'); R(x, 168, 16, 2, '#e08050'); R(x + 7, 160, 2, 16, '#e08050'); }
      const brick = (x, y) => { R(x, y, 16, 16, '#b05020'); R(x, y, 16, 2, '#e08050'); R(x, y + 7, 16, 2, '#e08050'); R(x + 7, y, 2, 8, '#e08050'); R(x + 7, y + 8, 2, 8, '#e08050'); };
      const qblock = (x, y) => { R(x, y, 16, 16, '#e0a020'); R(x + 2, y + 2, 12, 12, '#f0c040'); txt('?', x + 5, y + 3, '#7a4a00'); };
      brick(96, 96); qblock(112, 96); brick(128, 96);
      brick(176, 128); brick(192, 128); brick(208, 128);
      R(194, 134, 28, 26, '#1a5a1a'); R(196, 136, 24, 24, '#2a8a2a'); R(192, 132, 32, 8, '#1a5a1a'); R(194, 134, 28, 6, '#3aa83a');
      R(56, 136, 12, 16, '#e0e0e0'); R(56, 132, 12, 4, '#2a4ad0'); R(58, 128, 3, 6, '#fff'); R(52, 140, 4, 8, '#2a4ad0'); R(68, 140, 4, 8, '#2a4ad0');
      R(59, 140, 2, 2, '#111'); R(63, 140, 2, 2, '#111');
      for (const [x, y] of [[90, 80], [106, 80], [122, 80]]) { R(x, y, 6, 8, '#ffd040'); R(x + 1, y + 2, 4, 4, '#fff080'); }
      txt('SCORE 1200', 8, 8, '#fff'); txt('1-1', 210, 8, '#fff'); txt('TIME 300', 160, 180, '#fff');
    });
  }

  function sceneSpace() {
    return gameCanvas((g) => {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const txt = (t, x, y, c) => { g.font = `12px ${FONT}`; g.fillStyle = c; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(t, x, y); };
      R(0, 0, 256, 192, '#000');
      for (let i = 0; i < 70; i++) R((i * 97) % 256, (i * 57) % 192, 1, 1, i % 5 ? '#fff' : '#8cf');
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
        const x = 40 + c * 30, y = 24 + r * 24;
        R(x, y, 12, 8, '#e040c0'); R(x + 2, y + 2, 8, 4, '#40ff80'); R(x - 2, y + 4, 3, 3, '#e040c0'); R(x + 11, y + 4, 3, 3, '#e040c0');
      }
      R(120, 158, 16, 8, '#40e0ff'); R(124, 150, 8, 10, '#fff'); R(126, 146, 4, 6, '#40e0ff'); R(112, 162, 8, 4, '#2080c0'); R(136, 162, 8, 4, '#2080c0');
      R(126, 120, 2, 26, '#40e0ff'); R(130, 128, 2, 18, '#40e0ff');
      R(60, 70, 8, 8, '#ffd040'); R(56, 74, 16, 4, '#ff7a00'); R(62, 66, 4, 16, '#ff7a00');
      txt('SCORE 12K', 8, 8, '#fff'); txt('SHLD 3', 200, 8, '#fff');
    });
  }

  function gameScene(draw) {
    return gameCanvas((g) => {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const txt = (t, x, y, c) => { g.font = `12px ${FONT}`; g.fillStyle = c; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(t, x, y); };
      draw(g, R, txt);
    });
  }

  function scenePong() {
    return gameScene((g, R) => {
      R(0, 0, 256, 192, '#000');
      R(0, 0, 256, 2, '#fff'); R(0, 190, 256, 2, '#fff');
      for (let y = 6; y < 192; y += 12) R(126, y, 3, 6, '#fff');
      R(14, 72, 6, 30, '#fff'); R(236, 92, 6, 30, '#fff');
      R(150, 66, 6, 6, '#fff');
      g.font = `24px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.fillText('3', 70, 12); g.fillText('5', 170, 12);
    });
  }

  function sceneTetris() {
    return gameScene((g, R, txt) => {
      R(0, 0, 256, 192, '#080a18');
      R(58, 0, 140, 192, '#0e122b');
      for (let x = 58; x <= 198; x += 14) R(x, 0, 1, 192, '#1b2246');
      for (let y = 0; y <= 192; y += 14) R(58, y, 141, 1, '#1b2246');
      const cell = (x, y, c) => R(59 + x * 14 + 1, y * 14 + 1, 12, 12, c);
      const cols = ['#00e0e0', '#e0e000', '#a040e0', '#e04040', '#40c040'];
      for (let x = 0; x < 10; x++) {
        const h = 1 + ((x * 3) % 3);
        for (let y = 0; y < h; y++) cell(x, 13 - y, cols[(x + y) % 5]);
      }
      cell(3, 4, '#00e0e0'); cell(4, 4, '#00e0e0'); cell(5, 4, '#00e0e0'); cell(5, 5, '#00e0e0');
      R(208, 20, 36, 36, '#0e122b'); R(208, 20, 36, 2, '#334'); R(208, 54, 36, 2, '#334');
      txt('NEXT', 208, 6, '#8ab'); txt('1200', 208, 150, '#fff');
    });
  }

  function scenePac() {
    return gameScene((g, R, txt) => {
      R(0, 0, 256, 192, '#000');
      const wall = '#2038e0';
      R(0, 24, 256, 4, wall); R(0, 188, 256, 4, wall); R(0, 24, 4, 168, wall); R(252, 24, 4, 168, wall);
      for (const [x, y, w, h] of [[16, 44, 48, 4], [96, 44, 64, 4], [176, 44, 48, 4], [16, 80, 4, 24], [60, 80, 40, 4], [120, 80, 4, 24], [176, 80, 40, 4], [16, 120, 60, 4], [100, 120, 56, 4], [176, 120, 48, 4]]) R(x, y, w, h, wall);
      for (let x = 16; x < 240; x += 16) for (let y = 56; y < 180; y += 16) if ((x + y) % 32 === 0) R(x, y, 3, 3, '#ffe0a0');
      g.fillStyle = '#ffe000'; g.beginPath(); g.moveTo(64, 96); g.arc(64, 96, 12, 0.25 * Math.PI, 1.75 * Math.PI); g.closePath(); g.fill();
      R(62, 88, 3, 3, '#000');
      const ghost = (x, c) => { R(x, 88, 16, 14, c); R(x, 86, 16, 6, c); R(x + 2, 92, 3, 3, '#fff'); R(x + 11, 92, 3, 3, '#fff'); R(x + 2, 102, 3, 4, c); R(x + 7, 102, 3, 4, c); R(x + 12, 102, 3, 4, c); };
      ghost(180, '#ff4040'); ghost(210, '#40e0ff');
      txt('1UP', 8, 4, '#fff'); txt('0000', 8, 10, '#fff');
    });
  }

  function sceneInvaders() {
    return gameScene((g, R, txt) => {
      R(0, 0, 256, 192, '#000');
      const alien = (x, y, c) => { R(x + 2, y, 8, 4, c); R(x, y + 4, 12, 4, c); R(x + 2, y + 8, 8, 4, c); R(x + 4, y + 12, 4, 4, c); };
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) alien(20 + c * 26, 24 + r * 24, ['#40e040', '#40e0e0', '#e0e040'][r]);
      for (let i = 0; i < 3; i++) R(40 + i * 70, 140, 24, 14, '#40c040');
      R(118, 170, 20, 8, '#fff'); R(124, 162, 8, 8, '#40e0ff'); R(126, 158, 4, 4, '#40e0ff');
      R(127, 120, 2, 10, '#fff'); R(60, 100, 2, 8, '#fff');
      txt('SCORE 0080', 8, 4, '#fff');
    });
  }

  function sceneFighter() {
    return gameScene((g, R, txt) => {
      const sky = g.createLinearGradient(0, 0, 0, 150);
      sky.addColorStop(0, '#ff8a4a'); sky.addColorStop(1, '#7a2a6a');
      g.fillStyle = sky; g.fillRect(0, 0, 256, 192);
      for (const [x, w, h] of [[0, 30, 60], [34, 24, 80], [64, 30, 50], [100, 26, 70], [130, 30, 55], [166, 24, 84], [196, 30, 60], [230, 26, 50]]) R(x, 140 - h, w, h, '#2a1430');
      for (let i = 0; i < 40; i++) R((i * 37) % 256, 90 + ((i * 23) % 50), 2, 2, '#ffd070');
      R(0, 150, 256, 42, '#1a0d18');
      R(10, 8, 100, 8, '#c02020'); R(146, 8, 100, 8, '#20a040');
      R(10, 8, 60, 8, '#ff4040'); R(146, 8, 70, 8, '#40e060');
      const f1 = (x, y) => { R(x, y, 14, 6, '#f0c090'); R(x + 1, y + 6, 12, 18, '#ffd040'); R(x - 2, y + 8, 4, 10, '#c02020'); R(x + 12, y + 8, 4, 10, '#c02020'); R(x + 2, y + 24, 4, 10, '#111'); R(x + 8, y + 24, 4, 10, '#111'); };
      const f2 = (x, y) => { R(x, y, 14, 6, '#f0c090'); R(x + 1, y + 6, 12, 18, '#2050c0'); R(x - 2, y + 8, 4, 10, '#fff'); R(x + 12, y + 8, 4, 10, '#fff'); R(x + 2, y + 24, 4, 10, '#111'); R(x + 8, y + 24, 4, 10, '#111'); };
      f1(80, 104); f2(156, 104);
      R(118, 110, 14, 4, '#ffd040');
      txt('FIGHT!', 110, 64, '#ffe040');
    });
  }

  function sceneRacing() {
    return gameScene((g, R, txt) => {
      R(0, 0, 256, 192, '#2a7a2a');
      R(70, 0, 116, 192, '#555'); R(70, 0, 4, 192, '#ddd'); R(182, 0, 4, 192, '#ddd');
      for (let y = 0; y < 192; y += 24) R(126, y, 4, 12, '#ffd040');
      const car = (x, y, c) => { R(x, y, 20, 28, c); R(x + 3, y + 4, 14, 8, '#9cf'); R(x + 3, y + 16, 14, 6, '#9cf'); R(x - 2, y + 6, 2, 8, '#111'); R(x + 20, y + 6, 2, 8, '#111'); };
      car(90, 120, '#e02020'); car(140, 40, '#2050e0');
      txt('LAP 2/3', 8, 6, '#fff'); txt('120', 210, 6, '#fff');
    });
  }

  function sceneBomber() {
    return gameScene((g, R, txt) => {
      R(0, 0, 256, 192, '#1a5a1a');
      const hard = (x, y) => { R(x, y, 32, 32, '#7a7a7a'); R(x + 2, y + 2, 28, 28, '#9a9a9a'); R(x + 6, y + 6, 20, 20, '#7a7a7a'); };
      for (let x = 0; x < 256; x += 64) for (let y = 32; y < 192; y += 64) { hard(x, y); hard(x + 32, y + 32); }
      R(56, 120, 18, 18, '#fff'); R(60, 110, 10, 10, '#f0c090'); R(62, 112, 2, 2, '#111'); R(66, 112, 2, 2, '#111');
      const bomb = (x, y) => { R(x, y, 14, 14, '#111'); R(x + 4, y - 4, 2, 5, '#aaa'); R(x + 2, y + 3, 3, 3, '#fff'); };
      bomb(140, 80); bomb(90, 150);
      R(150, 70, 8, 8, '#ff8000'); R(146, 74, 16, 4, '#ffd040'); R(154, 66, 4, 16, '#ffd040');
      txt('STAGE 1', 8, 6, '#fff');
    });
  }

  function sceneNinja() {
    return gameScene((g, R, txt) => {
      const sky = g.createLinearGradient(0, 0, 0, 192);
      sky.addColorStop(0, '#0a1030'); sky.addColorStop(1, '#1a2050');
      g.fillStyle = sky; g.fillRect(0, 0, 256, 192);
      g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(200, 42, 18, 0, 7); g.fill();
      R(20, 110, 120, 60, '#0a0d18'); R(30, 96, 100, 20, '#0a0d18');
      R(40, 86, 80, 12, '#0a0d18'); R(56, 74, 48, 12, '#0a0d18');
      R(24, 96, 112, 6, '#2a3050'); R(36, 86, 88, 6, '#2a3050'); R(52, 74, 56, 6, '#2a3050');
      R(150, 120, 14, 20, '#101018'); R(152, 112, 10, 10, '#101018'); R(154, 116, 6, 3, '#e04040'); R(148, 140, 6, 8, '#101018'); R(160, 140, 6, 8, '#101018');
      R(186, 110, 4, 4, '#c0c0c0'); R(182, 114, 12, 4, '#c0c0c0'); R(186, 118, 4, 4, '#c0c0c0');
      txt('STAGE 1', 8, 6, '#fff');
    });
  }

  function sceneUnderwater() {
    return gameScene((g, R, txt) => {
      const sea = g.createLinearGradient(0, 0, 0, 192);
      sea.addColorStop(0, '#0a4a8a'); sea.addColorStop(1, '#041a3a');
      g.fillStyle = sea; g.fillRect(0, 0, 256, 192);
      for (const [x, c] of [[20, '#e06080'], [40, '#e0a040'], [220, '#a060e0']]) { R(x, 150, 8, 42, c); R(x - 8, 160, 24, 6, c); R(x + 4, 138, 6, 16, c); }
      const fish = (x, y, c) => { R(x, y, 18, 8, c); R(x + 18, y - 4, 8, 16, c); R(x + 24, y - 2, 4, 12, c); R(x + 4, y + 2, 3, 3, '#fff'); };
      fish(70, 70, '#ffd040'); fish(160, 110, '#40e0e0');
      for (let i = 0; i < 12; i++) R(60 + ((i * 37) % 140), 20 + ((i * 29) % 120), 3, 3, '#9cf');
      R(110, 120, 18, 10, '#e0e0e0'); R(128, 122, 8, 6, '#a0a0a0'); R(112, 130, 4, 10, '#2050c0'); R(122, 130, 4, 10, '#2050c0'); R(106, 120, 6, 4, '#40e0ff');
      txt('DEPTH 100', 8, 6, '#9cf');
    });
  }

  function sceneMotocross() {
    return gameScene((g, R, txt) => {
      const sky = g.createLinearGradient(0, 0, 0, 120);
      sky.addColorStop(0, '#5c94fc'); sky.addColorStop(1, '#a0c8ff');
      g.fillStyle = sky; g.fillRect(0, 0, 256, 192);
      g.fillStyle = '#8a5a20'; g.beginPath(); g.moveTo(0, 192); g.lineTo(0, 150); g.quadraticCurveTo(60, 110, 120, 150); g.quadraticCurveTo(180, 190, 256, 140); g.lineTo(256, 192); g.closePath(); g.fill();
      R(0, 150, 256, 42, '#8a5a20');
      for (let i = 0; i < 10; i++) R(i * 28, 160 + ((i * 13) % 20), 12, 3, '#d0a060');
      R(96, 120, 22, 6, '#e02020'); R(100, 112, 14, 6, '#e02020'); R(98, 126, 6, 6, '#111'); R(112, 126, 6, 6, '#111'); R(104, 104, 6, 10, '#fff'); R(105, 98, 4, 6, '#f0c090');
      for (let i = 0; i < 8; i++) R(80 - i * 6, 150 + ((i % 3) * 4), 6, 4, '#c0a080');
      txt('LAP 1', 8, 6, '#fff'); txt('TIME 60', 180, 6, '#fff');
    });
  }

  function sceneArkanoid() {
    return gameScene((g, R, txt) => {
      R(0, 0, 256, 192, '#000');
      const colors = ['#e04040', '#e0a040', '#40c040', '#40a0e0', '#a060e0'];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) { if (r === 4 && c % 3 === 0) continue; R(12 + c * 24, 20 + r * 14, 20, 10, colors[r]); }
      R(96, 168, 64, 8, '#e0e0e0'); R(104, 166, 48, 4, '#9cf');
      R(126, 150, 6, 6, '#fff');
      txt('SCORE 0240', 8, 6, '#fff');
    });
  }

  function sceneBeat() {
    return gameScene((g, R, txt) => {
      R(0, 0, 256, 192, '#20242e');
      for (let y = 0; y < 128; y += 16) for (let x = ((y / 16) % 2) * 16; x < 256; x += 32) { R(x, y, 30, 14, '#5a3a2a'); R(x, y, 30, 2, '#8a5a3a'); }
      R(0, 128, 256, 64, '#3a3f4a'); R(0, 128, 256, 4, '#6a7080');
      const man = (x, c) => { R(x, 88, 14, 6, '#f0c090'); R(x + 1, 94, 12, 20, c); R(x - 2, 96, 4, 12, '#f0c090'); R(x + 12, 96, 4, 12, '#f0c090'); R(x + 2, 114, 4, 14, '#111'); R(x + 8, 114, 4, 14, '#111'); };
      man(70, '#e04040'); man(170, '#2050c0');
      R(96, 100, 16, 4, '#ffd040');
      R(10, 8, 90, 6, '#c02020'); R(156, 8, 90, 6, '#20a040');
      txt('1P', 10, 16, '#fff'); txt('2P', 210, 16, '#fff');
    });
  }

  function sceneCircus() {
    return gameScene((g, R, txt) => {
      R(0, 0, 256, 192, '#1a0a1a');
      for (let i = 0; i < 12; i++) { R(i * 24, 0, 12, 60, '#c02020'); R(i * 24 + 12, 0, 12, 60, '#f0e0d0'); }
      g.strokeStyle = '#ff8000'; g.lineWidth = 8; g.beginPath(); g.arc(128, 110, 38, 0, 7); g.stroke();
      g.strokeStyle = '#ffd040'; g.lineWidth = 3; g.beginPath(); g.arc(128, 110, 38, 0, 7); g.stroke();
      R(112, 96, 32, 18, '#e0a040'); R(108, 92, 12, 14, '#e0a040'); R(106, 96, 4, 4, '#111'); R(104, 86, 6, 6, '#c08020');
      R(80, 160, 96, 6, '#40a0e0'); R(86, 166, 84, 4, '#2050a0');
      txt('STAGE 2', 8, 6, '#fff');
    });
  }

  function sceneTennis() {
    return gameScene((g, R, txt) => {
      R(0, 0, 256, 192, '#2a8a4a');
      R(0, 96, 256, 2, '#fff'); R(0, 150, 256, 2, '#fff'); R(0, 0, 2, 192, '#fff'); R(254, 0, 2, 192, '#fff');
      R(128, 40, 3, 140, '#fff');
      for (let y = 44; y < 180; y += 6) R(128, y, 3, 3, '#ddd');
      const p = (x, y) => { R(x, y, 10, 14, '#fff'); R(x + 1, y - 6, 8, 6, '#f0c090'); R(x - 2, y + 2, 4, 8, '#f0c090'); };
      p(60, 110); p(190, 70);
      R(150, 80, 5, 5, '#ffe040');
      txt('1P', 8, 6, '#fff'); txt('2P', 210, 6, '#fff');
    });
  }

  let navigating = false;
  function goNext() {
    if (navigating) return;
    navigating = true;
    document.body.classList.add('is-leaving');
    setTimeout(() => {
      if (EMBED) {
        try { parent.postMessage('dsh-subor:done', '*'); } catch (e) {}
        return;
      }
      if (NEXT) location.href = NEXT;
    }, 520);
  }

  const SNAKE_COLS = 12;
  const SNAKE_ROWS = 9;
  const SNAKE_STEP = 0.007;
  const SNAKE = (() => {
    const out = [];
    let top = 0, bottom = SNAKE_ROWS - 1, left = 0, right = SNAKE_COLS - 1;
    while (top <= bottom && left <= right) {
      for (let c = left; c <= right; c++) out.push([c, top]);
      top++;
      for (let r = top; r <= bottom; r++) out.push([right, r]);
      right--;
      if (top <= bottom) { for (let c = right; c >= left; c--) out.push([c, bottom]); bottom--; }
      if (left <= right) { for (let r = bottom; r >= top; r--) out.push([left, r]); left++; }
    }
    return out;
  })();

  let WALL_GRID = [];
  function buildWallGrid() {
    const N = sprites.games.length;
    const ROWS = SNAKE_ROWS;
    const COLS = SNAKE_COLS;
    const pool = [];
    for (let i = 0; i < ROWS * COLS; i++) pool.push(i % N);
    let seed = 20261112;
    for (let i = pool.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      const j = seed % (i + 1);
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    WALL_GRID = [];
    let k = 0;
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        let idx = pool[k++ % pool.length];
        let guard = 0;
        while (guard++ < 40 && ((c > 0 && row[c - 1] === idx) || (r > 0 && WALL_GRID[r - 1][c] === idx))) {
          idx = pool[k++ % pool.length];
        }
        row.push(idx);
      }
      WALL_GRID.push(row);
    }
  }

  function drawWall(g, mt) {
    const TILE_W = W / SNAKE_COLS;
    const TILE_H = H / SNAKE_ROWS;
    const N = SNAKE.length;
    const progress = clamp(mt / SNAKE_STEP, 0, N);

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);

    for (let i = 0; i < Math.floor(progress); i++) {
      const [c, r] = SNAKE[i];
      const age = mt - i * SNAKE_STEP;
      const sc = 0.55 + 0.45 * easeOutBack(clamp(age / 0.06));
      const alpha = clamp(age / 0.1);
      const x = c * TILE_W;
      const y = r * TILE_H;

      g.save();
      g.globalAlpha = alpha;
      g.translate(x + TILE_W / 2, y + TILE_H / 2);
      g.scale(sc, sc);
      g.translate(-TILE_W / 2, -TILE_H / 2);

      g.fillStyle = '#05070c';
      g.fillRect(0, 0, TILE_W, TILE_H);
      g.strokeStyle = '#2a3446';
      g.lineWidth = 1;
      g.strokeRect(1.5, 1.5, TILE_W - 3, TILE_H - 3);

      const scene = sprites.games[WALL_GRID[r] ? WALL_GRID[r][c] : (r * 3 + c) % sprites.games.length];
      g.drawImage(scene, 0, 0, 320, 240, 3, 3, TILE_W - 6, TILE_H - 6);

      g.fillStyle = '#ff2d20';
      g.fillRect(TILE_W - 8, 4, 2, 2);
      g.restore();
    }

    // 蛇头
    if (progress < N) {
      const [c, r] = SNAKE[Math.floor(progress)];
      const x = c * TILE_W;
      const y = r * TILE_H;
      g.save();
      g.strokeStyle = '#7fe6ff';
      g.lineWidth = 2;
      g.shadowColor = '#7fe6ff';
      g.shadowBlur = 12;
      g.strokeRect(x + 2, y + 2, TILE_W - 4, TILE_H - 4);
      g.restore();
    }
  }

  function renderAttract(t) {
    const a = t - T.attract;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const T1 = 0.25;
    const FILL = SNAKE.length * SNAKE_STEP;
    const HOLD = 0.35;
    const T2 = T1 + FILL + HOLD;

    if (a < T1) {
      drawScene(sceneCtx, T.attract - 0.1);
      ctx.drawImage(sceneCanvas, 0, 0);
      drawNoise(0.12 + 0.5 * (a / T1), t);
      drawScanlines();
      return;
    }

    if (a < T2) {
      drawWall(sceneCtx, Math.min(a - T1, FILL));
      ctx.drawImage(sceneCanvas, 0, 0);
      drawScanlines();
      drawNoise(0.03, t);
      return;
    }

    // 闪白 → 渐黑
    drawWall(sceneCtx, FILL);
    ctx.drawImage(sceneCanvas, 0, 0);
    const p = a - T2;
    if (p < 0.12) {
      ctx.fillStyle = `rgba(255,255,255,${p / 0.12})`;
      ctx.fillRect(0, 0, W, H);
    } else {
      const q = clamp((p - 0.12) / 0.45);
      ctx.fillStyle = `rgba(0,0,0,${q})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (p > 0.6 && SEEK === null) goNext();
  }

  function renderFrame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (!started) {
      drawStandby();
      return;
    }

    if (ATTRACT && t >= T.attract) {
      renderAttract(t);
      return;
    }

    drawPower(t);

    const a = smoothstep(T.screen, T.screenEnd, t);
    if (a > 0) {
      drawScene(sceneCtx, t);
      ctx.save();
      const d = t - T.screen;
      if (d >= 0 && d < 1.25) {
        const amp = Math.exp(-d * 4.2);
        const s = 1 + 0.012 * amp * Math.cos(d * 24);
        ctx.translate(W / 2, H / 2);
        ctx.scale(s, s);
        ctx.translate(-W / 2, -H / 2);
        ctx.translate(Math.sin(d * 45) * amp * 1.4, 0);
      }
      ctx.translate(shakeAt(t), 0);
      ctx.globalAlpha = a;
      ctx.drawImage(sceneCanvas, 0, 0);
      ctx.restore();
    }

    drawPowerFlash(t);
    drawScanlines();
    drawScanRoll(t);
    drawNoise(noiseAmount(t), t);
  }

  /* ------------------------------------------------------------
     声音
     ------------------------------------------------------------ */
  const AudioKit = {
    ctx: null,
    master: null,
    muted: false,
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
    },
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.55;
    }
  };

  const sfx = {
    tone(freq, dur, opts = {}) {
      const ac = AudioKit.ctx;
      if (!ac || AudioKit.muted) return;
      const { type = 'square', vol = 0.05, to = null, delay = 0 } = opts;
      const t0 = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(AudioKit.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    noise(dur, opts = {}) {
      const ac = AudioKit.ctx;
      if (!ac || AudioKit.muted) return;
      const { vol = 0.05, freq = 1500, q = 0.7, delay = 0 } = opts;
      const t0 = ac.currentTime + delay;
      const len = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = q;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp);
      bp.connect(gain);
      gain.connect(AudioKit.master);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    },
    power() {
      sfx.noise(0.09, { vol: 0.14, freq: 2600, q: 0.5 });
      sfx.tone(92, 0.4, { type: 'sine', vol: 0.16, to: 44 });
      sfx.tone(56, 1.3, { type: 'sine', vol: 0.035, to: 32, delay: 0.02 });
    }
  };

  /* 人声 */
  const voice = new Audio('audio/deepseek-short-deep.wav');
  voice.preload = 'auto';
  voice.volume = 0.95;

  let voiceOk = true;
  voice.addEventListener('error', () => {
    voiceOk = false;
    if (audioNote) audioNote.hidden = false;
  });

  let voiceUsed = false;

  function primeVoice() {
    try {
      voice.currentTime = 0;
      voice.volume = 0;
      const p = voice.play();
      if (p && p.then) {
        p.then(() => {
          voice.pause();
          voice.currentTime = 0;
          voice.volume = AudioKit.muted ? 0 : 0.95;
        }).catch(() => {
          voice.volume = AudioKit.muted ? 0 : 0.95;
        });
      }
    } catch (e) {
      /* ignore */
    }
  }

  function playVoice() {
    if (!voiceOk || AudioKit.muted) return;
    voiceUsed = true;
    try {
      voice.currentTime = 0;
      voice.volume = 0.95;
      const p = voice.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {
      /* ignore */
    }
  }

  /* ------------------------------------------------------------
     时间轴驱动
     ------------------------------------------------------------ */
  let started = false;
  let ready = false;
  let t = 0;
  let lastTs = 0;
  let raf = 0;
  let booted = false;
  const fired = new Set();

  function cue(key, time, fn) {
    if (t >= time && !fired.has(key)) {
      fired.add(key);
      fn();
    }
  }

  let snakeIdx = -1;

  function audioCues() {
    if (ATTRACT) {
      const mt = t - T.attract - 0.4;
      if (mt > 0) {
        const idx = Math.min(SNAKE.length - 1, Math.floor(mt / SNAKE_STEP));
        if (idx > snakeIdx) {
          snakeIdx = idx;
          sfx.tone(520 + idx * 10, 0.012, { vol: 0.01 });
        }
      }
    }
    cue('power', 0.12, () => sfx.power());
    cue('static', T.screen + 0.02, () =>
      sfx.noise(0.32, { vol: 0.055, freq: 3200, q: 0.35 })
    );
    cue('mascot', T.mascot, () => sfx.tone(480, 0.1, { to: 980, vol: 0.035 }));
    cue('fu', T.fu, () => sfx.tone(660, 0.05, { vol: 0.02 }));
    cue('le', T.le, () => sfx.tone(880, 0.05, { vol: 0.02 }));

    for (let i = 0; i < 3; i++) {
      cue('t' + i, T.title[i], () => {
        sfx.tone(1568, 0.04, { vol: 0.028 });
        sfx.tone(196, 0.09, { type: 'triangle', vol: 0.045, to: 120 });
      });
    }

    for (let i = 0; i < SUBTITLE.length; i++) {
      cue('s' + i, T.sub + i * T.subStep, () =>
        sfx.tone(1120 + (i % 3) * 130, 0.02, { vol: 0.016 })
      );
    }

    cue('voice', T.voice, () => playVoice());

    for (let i = 0; i < 4; i++) {
      cue('g' + i, SLOGAN_AT[i], () =>
        sfx.tone(220, 0.06, { type: 'triangle', vol: 0.02, to: 150 })
      );
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min(0.05, (now - lastTs) / 1000 || 0));
    lastTs = now;
    t += dt;
    audioCues();
    renderFrame(t);
    if (!booted && t > 7.6) {
      booted = true;
      window.dispatchEvent(new CustomEvent('xbw:booted'));
    }
    if (t > END && LOOP) restart();
  }

  function start() {
    if (!ready || started) return;
    started = true;
    document.body.classList.add('is-on');
    gate.classList.add('is-hidden');
    AudioKit.init();
    AudioKit.resume();
    primeVoice();
    setTimeout(() => {
      if (AudioKit.ctx && AudioKit.ctx.state === 'suspended' && audioNote) {
        audioNote.hidden = false;
        audioNote.textContent = '点击开启声音';
      }
    }, 500);
    t = 0;
    fired.clear();
    lastTs = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function restart() {
    if (!ready) return;
    booted = false;
    voice.pause();
    try {
      voice.currentTime = 0;
    } catch (e) {}
    fired.clear();
    snakeIdx = -1;
    t = 0;
    lastTs = performance.now();
    if (!started) {
      started = true;
      document.body.classList.add('is-on');
      gate.classList.add('is-hidden');
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function toggleMute() {
    AudioKit.setMuted(!AudioKit.muted);
    voice.volume = AudioKit.muted ? 0 : 0.95;
    if (muteLabel) muteLabel.textContent = AudioKit.muted ? '取消静音' : '静音';
  }

  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ------------------------------------------------------------
     交互
     ------------------------------------------------------------ */
  gate.addEventListener('click', start);
  gate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      start();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!started) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        start();
      }
      return;
    }
    if (ATTRACT && t > T.attract) { goNext(); return; }
    if (e.key === 'r' || e.key === 'R') restart();
    else if (e.key === 'm' || e.key === 'M') toggleMute();
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });

  document.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'replay') restart();
      else if (act === 'mute') toggleMute();
      else if (act === 'full') toggleFullscreen();
    });
  });

  // 鼠标闲置后让 HUD 淡下去
  let idleTimer = 0;
  function wake() {
    document.body.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.body.classList.add('is-idle'), 3800);
  }
  window.addEventListener('mousemove', wake, { passive: true });
  window.addEventListener('touchstart', wake, { passive: true });
  window.addEventListener('keydown', wake);

  // ?auto=1 时浏览器可能拦截声音：第一次点按就把上下文和人声接上
  function unlockAudio() {
    AudioKit.init();
    AudioKit.resume();
    if (audioNote && audioNote.textContent === '点击开启声音') audioNote.hidden = true;
    if (started && !AudioKit.muted && voiceOk && t > T.voice - 0.2 && t < T.voice + 3.4) {
      try {
        if (voice.paused) {
          voice.currentTime = Math.max(0, t - T.voice - 0.1);
          voice.play().catch(() => {});
        }
      } catch (e) {}
    }
  }
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  // 切到后台时别让声音继续飘
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      voice.pause();
    } else if (started && voiceUsed && !AudioKit.muted && t > T.voice && t < T.voice + 4) {
      voice.play().catch(() => {});
    }
  });

  /* ------------------------------------------------------------
     启动
     ------------------------------------------------------------ */
  async function boot() {
    if (ready) return;
    const imgs = ATTRACT ? await loadGameImages() : [];
    ready = true;
    buildSprites(imgs);
    if (SEEK !== null) {
      started = true;
      document.body.classList.add('is-on', 'is-static');
      gate.classList.add('is-hidden');
      t = SEEK;
      renderFrame(SEEK);
      return;
    }
    renderFrame(0);
    if (AUTO) start();
    else if (!GATE) setTimeout(() => { if (!started) start(); }, EMBED ? 300 : (document.documentElement.classList.contains('dsh-subor-full') ? 300 : 1500));
  }

  const fontReady =
    document.fonts && document.fonts.load
      ? Promise.all([
          document.fonts.load('84px "XBW Pixel"', '小霸王其乐无穷'),
          document.fonts.load('24px "XBW Pixel"', 'DeepSeek Harness 深度 求索 其乐无穷')
        ]).then(() => document.fonts.ready)
      : Promise.resolve();

  Promise.race([fontReady, new Promise((r) => setTimeout(r, 1800))])
    .then(boot)
    .catch(boot);

  // 调试用
  window.__xbw = {
    render: (time) => {
      t = time;
      renderFrame(time);
    },
    start,
    restart,
    get time() {
      return t;
    },
    audio: () => ({
      ok: voiceOk,
      muted: AudioKit.muted,
      voiceTime: voice.currentTime,
      duration: voice.duration,
      src: voice.src.split('/').pop(),
      paused: voice.paused,
      err: voice.error ? voice.error.code : null,
      ctx: AudioKit.ctx ? AudioKit.ctx.state : null
    })
  };
})();
