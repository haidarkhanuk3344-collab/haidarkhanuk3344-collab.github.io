/** Original Chess television programmes, using the room's canvas-channel API. */
import { profile, projects } from './chess-content.js';

const W = 960, H = 720;
const C = { cream: '#eee5cc', paper: '#f7efd9', burgundy: '#733b3a', olive: '#566045', ink: '#303b2c', sand: '#c9b88f', gold: '#d5ad68' };
const FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const MONO = '"Courier New", monospace';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = v => 1 - Math.pow(1 - clamp(v), 3);

function rect(g, x, y, w, h, color) { g.fillStyle = color; g.fillRect(x, y, w, h); }
function text(g, value, x, y, size = 32, color = C.ink, weight = 500, family = FONT, align = 'left') {
  g.font = `${weight} ${size}px ${family}`; g.textBaseline = 'top'; g.textAlign = align; g.fillStyle = color; g.fillText(String(value), x, y);
}
function line(g, x1, y1, x2, y2, color, width = 1) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineWidth = width; g.strokeStyle = color; g.stroke();
}
function wrap(g, value, x, y, width, size = 30, color = C.ink, lh = size * 1.5, weight = 400) {
  g.font = `${weight} ${size}px ${FONT}`;
  let row = '', yy = y;
  for (const ch of String(value)) {
    if (ch === '\n') { text(g, row, x, yy, size, color, weight); row = ''; yy += lh; continue; }
    if (row && g.measureText(row + ch).width > width) { text(g, row, x, yy, size, color, weight); row = ch; yy += lh; }
    else row += ch;
  }
  if (row) text(g, row, x, yy, size, color, weight);
  return yy + lh;
}
function fit(g, media, x, y, w, h) {
  const iw = media?.videoWidth || media?.naturalWidth, ih = media?.videoHeight || media?.naturalHeight;
  if (!(iw && ih)) return false;
  const s = Math.min(w / iw, h / ih);
  g.drawImage(media, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
  return true;
}
function circle(g, x, y, r, color) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = color; g.fill(); }
function basketball(g, x, y, r, t, ink = C.burgundy, fill = C.gold) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * .25) * .08);
  circle(g, 0, 0, r, fill); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.clip();
  line(g, -r, 0, r, 0, ink, 5); line(g, 0, -r, 0, r, ink, 5);
  g.strokeStyle = ink; g.lineWidth = 5;
  for (const sign of [-1, 1]) { g.beginPath(); g.ellipse(sign * r * 1.05, 0, r * .86, r * 1.22, 0, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}
function asterisk(g, x, y, r, color, t = 0) {
  g.save(); g.translate(x, y); g.rotate(t * .07); g.strokeStyle = color; g.lineWidth = r * .16;
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; line(g, Math.cos(a) * r * .2, Math.sin(a) * r * .2, Math.cos(a) * r, Math.sin(a) * r, color, r * .16); }
  g.restore();
}
function chrome(g, { number = '00', label = 'CHESS / PERSONAL TV', light = false, time = 0, length = 30, paused = false }) {
  const ink = light ? C.cream : C.olive;
  text(g, label, 60, 40, 18, ink, 600, MONO);
  text(g, `TAPE ${number}`, 900, 40, 18, ink, 600, MONO, 'right');
  line(g, 60, 72, 900, 72, ink, 1);
  line(g, 60, 650, 900, 650, ink, 1);
  text(g, paused ? 'Ⅱ 暂停' : '▶ PLAY', 62, 668, 16, ink, 500, paused ? FONT : MONO);
  text(g, '电脑里看项目，房间里认识我', 480, 666, 19, ink, 500, FONT, 'center');
  const sec = Math.floor(time), stamp = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  text(g, stamp, 900, 668, 16, ink, 500, MONO, 'right');
  rect(g, 60, 648, 840 * clamp(time / length), 3, ink);
}

function labelFactory({ title, english = 'CHESS / PERSONAL', number = '00', accent = C.burgundy }) {
  return (g, w, h) => {
    g.save(); g.setTransform(w / 960, 0, 0, h / 160, 0, 0);
    rect(g, 0, 0, 960, 160, C.cream); rect(g, 0, 0, 18, 160, accent); rect(g, 24, 0, 5, 160, accent);
    text(g, number, 62, 41, 62, accent, 700, SERIF);
    line(g, 168, 27, 168, 133, accent, 2);
    let size = 62;
    while (size > 28) { g.font = `600 ${size}px ${FONT}`; if (g.measureText(title).width < 670) break; size--; }
    text(g, title, 203, 25, size, C.ink, 600);
    text(g, english.toUpperCase(), 207, 110, 21, accent, 600, MONO);
    rect(g, 0, 150, 960, 10, accent); g.restore();
  };
}

function makeChannel(config) {
  const length = config.length || 30;
  return {
    id: config.id, title: config.title, fill: true, length, ownsAudio: false,
    cassette: { shell: config.shell || C.burgundy, drawLabel: labelFactory(config) },
    mount({ canvas, ctx, width = 1024, height = 768 } = {}) {
      const g = ctx || canvas?.getContext('2d');
      if (!g) throw new TypeError('Chess TV requires a canvas 2D context.');
      let elapsed = 0, paused = false, dead = false, dirty = true, lastStage = -1, pendingPlay = false, videoBlocked = false, videoFailed = false, lastPlayAttempt = -10000;
      const images = new Map(), listeners = [];
      const p = config.project;
      const movie = p?.video ? document.createElement('video') : null;
      if (movie) {
        movie.src = p.video; movie.preload = 'auto'; movie.muted = true; movie.loop = true; movie.playsInline = true;
        movie.setAttribute('playsinline', '');
        const ready = () => { dirty = true; }, failed = () => { videoFailed = true; dirty = true; };
        for (const event of ['loadeddata', 'loadedmetadata', 'pause', 'play']) { movie.addEventListener(event, ready); listeners.push(() => movie.removeEventListener(event, ready)); }
        movie.addEventListener('error', failed); listeners.push(() => movie.removeEventListener('error', failed));
      }
      function image(url) {
        if (!url) return null;
        if (!images.has(url)) { const im = new Image(); im.onload = () => { dirty = true; }; im.onerror = () => { im.failed = true; dirty = true; }; im.src = url; images.set(url, im); }
        return images.get(url);
      }
      function playMovie(force = false) {
        if (!movie || dead || paused || document.hidden || pendingPlay || videoFailed || (!force && (videoBlocked || elapsed - lastPlayAttempt < 1000)) || !movie.paused) return;
        pendingPlay = true; lastPlayAttempt = elapsed;
        try {
          Promise.resolve(movie.play()).then(() => { if (dead || paused || stage() !== 1 || document.hidden) movie.pause(); videoBlocked = false; dirty = true; }).catch(() => { videoBlocked = true; dirty = true; }).finally(() => { pendingPlay = false; });
        } catch { pendingPlay = false; videoBlocked = true; }
      }
      function stage() { const t = elapsed / 1000; return config.kind === 'project' ? t < 5 ? 0 : t < 24 ? 1 : 2 : Math.min(2, Math.floor(t / (length / 3))); }
      function jump(which) {
        const starts = config.kind === 'project' ? [0, 5000, 24000] : [0, length * 1000 / 3, length * 2000 / 3];
        elapsed = starts[(which + 3) % 3]; lastStage = -1; dirty = true;
        if (movie) { movie.pause(); if (stage() === 1) { try { movie.currentTime = 0; } catch {} playMovie(true); } }
      }
      function intro(t, s) {
        if (s === 0) {
          rect(g, 0, 0, W, H, C.cream);
          text(g, 'CHESS / 冯恒鑫', 64, 112, 36, C.burgundy, 600);
          text(g, '好奇一点。', 56, 190, 91, C.burgundy, 600);
          text(g, '动手做点。', 56, 298, 91, C.burgundy, 600);
          text(g, profile.role, 64, 449, 31, C.olive, 500, SERIF);
          text(g, '研究 · 创造 · 篮球 · 运动', 65, 512, 29, C.olive, 500);
          basketball(g, 778, 386 + Math.sin(t * .9) * 9, 120, t);
          asterisk(g, 798, 161, 44, C.olive, t);
          text(g, 'KEEP CURIOUS.', 65, 590, 20, C.olive, 600, MONO);
        } else if (s === 1) {
          rect(g, 0, 0, W, H, C.olive);
          text(g, '把想法', 64, 119, 78, C.cream, 600);
          text(g, '变成原型。', 64, 216, 78, C.cream, 600);
          text(g, '从自己的体验里发现问题，', 67, 340, 29, C.cream);
          text(g, '再和 AI 一起，把它做出来。', 67, 385, 29, C.cream);
          const steps = ['研究问题', '定义边界', '推进原型'];
          steps.forEach((name, i) => { const x = 66 + i * 280; line(g, x, 481, x + 238, 481, C.sand, 2); text(g, `0${i + 1}`, x, 505, 21, C.sand, 500, MONO); text(g, name, x, 543, 34, C.cream, 500); });
          asterisk(g, 793, 217, 81, C.gold, t);
        } else {
          rect(g, 0, 0, W, H, C.burgundy);
          text(g, '欢迎来到', 65, 119, 35, C.cream, 500);
          text(g, '我的兴趣现场。', 60, 181, 76, C.cream, 600);
          text(g, '电脑里看项目，', 66, 306, 45, C.cream, 500);
          text(g, '房间里认识我。', 66, 372, 45, C.cream, 500);
          projects.forEach((item, i) => { const x = 66 + i * 211; line(g, x, 485, x + 180, 485, C.sand, 2); text(g, `0${i + 1}`, x, 506, 18, C.sand, 500, MONO); text(g, item.title, x, 542, 30, C.cream, 500); });
          asterisk(g, 801, 364, 63, C.gold, t);
        }
        chrome(g, { number: '00', light: s !== 0, time: t, length, paused });
      }
      function project(t, s) {
        rect(g, 0, 0, W, H, s === 2 ? C.olive : C.cream);
        if (s === 0) {
          text(g, p.english, 64, 118, 28, C.olive, 500, SERIF);
          text(g, p.title, 59, 175, p.title.length > 4 ? 81 : 108, C.burgundy, 600);
          wrap(g, p.lead, 66, 326, 814, 42, C.ink, 64, 500);
          line(g, 65, 505, 894, 505, C.sand, 2);
          text(g, p.kind, 66, 531, 29, C.olive);
          text(g, p.status, 66, 579, 23, C.olive);
        } else if (s === 1) {
          text(g, p.title, 63, 96, 40, C.burgundy, 600);
          text(g, p.video ? '实际运行录像' : 'PROJECT VIEW', 895, 111, 20, C.olive, 500, p.video ? FONT : MONO, 'right');
          rect(g, 58, 157, 844, 418, C.ink);
          const im = image(p.image);
          const showingVideo = movie && movie.readyState >= 2 && !movie.paused;
          let shown = showingVideo ? fit(g, movie, 64, 163, 832, 406) : fit(g, im, 64, 163, 832, 406);
          if (!shown) { text(g, im?.failed ? '画面暂时未能加载' : '正在打开项目画面…', 480, 348, 28, C.cream, 500, FONT, 'center'); }
          if (movie && (videoBlocked || videoFailed || (!showingVideo && !paused))) {
            rect(g, 76, 516, 368, 43, '#293526e6');
            text(g, videoFailed ? '录像暂时不可用 · 当前为截图' : videoBlocked ? '点击屏幕，播放真实录像' : '正在载入真实录像…', 91, 526, 21, C.cream);
          }
          wrap(g, p.mediaNote, 65, 594, 830, 21, C.olive, 28);
        } else {
          text(g, p.title, 64, 117, 50, C.cream, 600);
          text(g, '仍在探索，也在继续。', 64, 193, 39, C.cream, 500);
          const relevant = p.sections.find(([title]) => /目前做到|下一步|当前功能|当前状态/.test(title)) || p.sections[p.sections.length - 1];
          wrap(g, relevant?.[1] || p.description, 66, 283, 819, 30, C.cream, 50);
          line(g, 66, 535, 891, 535, C.sand, 2);
          text(g, '到电脑里，继续读它的故事。', 66, 562, 32, C.cream, 500);
        }
        chrome(g, { number: config.number, label: `${p.english.toUpperCase()} / PROJECT TAPE`, light: s === 2, time: t, length, paused });
      }
      function note(t, s) {
        const palettes = [[C.cream, C.burgundy, C.olive], [C.olive, C.cream, C.sand], [C.burgundy, C.cream, C.sand]];
        const [bg, ink, sub] = palettes[s]; rect(g, 0, 0, W, H, bg);
        const lines = config.lines;
        const current = config.slides?.[s];
        const heading = current?.title || config.title;
        const body = current?.body || lines[s] || lines[0] || profile.intro;
        text(g, config.english || 'A NOTE FROM CHESS', 66, 119, 24, sub, 500, MONO);
        wrap(g, heading, 59, 190, 800, heading.length > 10 ? 58 : 77, ink, 99, 600);
        wrap(g, body, 66, 383, 804, 34, ink, 55);
        asterisk(g, 838, 570, 39, sub, t);
        chrome(g, { number: config.number, light: s !== 0, time: t, length, paused });
      }
      function paint() {
        g.save(); g.setTransform(width / W, 0, 0, height / H, 0, 0); g.globalAlpha = 1; g.imageSmoothingEnabled = true;
        const t = elapsed / 1000, s = stage();
        if (config.kind === 'welcome') intro(t, s); else if (config.kind === 'project') project(t, s); else note(t, s);
        // A very short exposure transition; the host provides the actual CRT and VHS treatment.
        const start = config.kind === 'project' ? [0, 5, 24][s] : s * length / 3;
        const a = (1 - ease((t - start) / .28)) * .2;
        if (a > 0) { g.globalAlpha = a; rect(g, 0, 0, W, H, C.cream); }
        g.restore(); dirty = false;
      }
      function frame(t, dt = 16) {
        if (dead) return false;
        if (!paused && !document.hidden) {
          elapsed = (elapsed + clamp(Number.isFinite(dt) ? dt : 16, 0, 100)) % (length * 1000);
          dirty = true;
        }
        const s = stage();
        if (s !== lastStage) { if (movie && s !== 1) movie.pause(); if (movie && s === 1) { videoBlocked = false; lastPlayAttempt = -10000; try { movie.currentTime = 0; } catch {} } lastStage = s; dirty = true; }
        if (s === 1 && !paused) playMovie();
        if (dirty) { paint(); return true; }
        return false;
      }
      function input(ev = {}) {
        if (dead) return false;
        if (ev.type === 'stop' || ev.type === 'pause' || ev.type === 'blur') { paused = true; movie?.pause(); dirty = true; return true; }
        if (ev.type === 'play' || ev.type === 'focus') { paused = false; if (stage() === 1) playMovie(true); dirty = true; return true; }
        if (ev.type === 'next' || ev.type === 'click' || ev.type === 'tap') {
          if ((ev.type === 'click' || ev.type === 'tap') && movie && stage() === 1 && videoBlocked) { playMovie(true); return true; }
          jump(stage() + 1); return true;
        }
        if (ev.type === 'prev') { jump(stage() - 1); return true; }
        if (ev.type === 'rewind' || ev.type === 'restart') { jump(0); return true; }
        return false;
      }
      const hidden = () => { if (document.hidden) movie?.pause(); dirty = true; };
      document.addEventListener('visibilitychange', hidden); listeners.push(() => document.removeEventListener('visibilitychange', hidden));
      function stop() {
        if (dead) return; dead = true;
        if (movie) { movie.pause(); movie.removeAttribute('src'); movie.load(); }
        listeners.forEach(clean => clean());
        for (const im of images.values()) { im.onload = null; im.onerror = null; }
        images.clear();
      }
      paint();
      return { frame, input, stop, get clock() { return elapsed / 1000; } };
    },
  };
}

export function makeProjectChannel(index) {
  const p = projects[index];
  if (!p) throw new RangeError(`Unknown Chess project index: ${index}`);
  return makeChannel({ kind: 'project', id: `chess-${p.id}`, title: p.title, english: p.english, project: p, number: String(index + 1).padStart(2, '0'), length: 32, shell: index % 2 ? C.olive : C.burgundy, accent: index % 2 ? C.olive : C.burgundy });
}

/** Optional config: { id,title,english,number,lines:[string,string,string],slides:[{title,body}],shell,length }. */
export function makeNoteChannel(config = {}) {
  return makeChannel({
    kind: 'note', id: config.id || 'chess-notes', title: config.title || '保持好奇', english: config.english || 'NOTES / CHESS',
    number: String(config.number ?? '05').padStart(2, '0'), length: clamp(Number(config.length) || 30, 15, 90),
    shell: config.shell || C.olive, accent: config.accent || C.olive,
    lines: Array.isArray(config.lines) && config.lines.length ? config.lines.map(String) : [profile.intro, '研究一点，动手做点。', '篮球、健身，在运动中找到乐趣。'],
    slides: Array.isArray(config.slides) ? config.slides : null,
  });
}

const welcome = makeChannel({ kind: 'welcome', id: 'chess-welcome', title: '欢迎来到 Chess 的房间', english: 'CHESS / PERSONAL TV', number: '00', length: 30, shell: C.burgundy, accent: C.burgundy });
export default welcome;
