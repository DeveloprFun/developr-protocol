// Hero circuit field. Same mechanic as the reference hero canvas (orthogonal traces, travelling pulses
// with a 6-step tail, nodes that light on arrival, scroll parallax capped at 48px, DPR capped at 1.5,
// paused when hidden / off-screen / reduced-motion) — own geometry and own code.
// Colours are read from CSS custom properties; no colour literals live here.

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function buildTraces(w, h, anchor, count, seed = 11) {
  const r = rng(seed);
  const snap = (v) => Math.round(v / 12) * 12;
  const traces = [];
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0;
    const ang = (left ? Math.PI : 0) + (r() - 0.5) * 1.7;
    const ring = anchor.r * (1.05 + r() * 0.9);
    const end = [snap(anchor.x + Math.cos(ang) * ring), snap(anchor.y + Math.sin(ang) * ring)];
    const start = [left ? -8 : w + 8, snap(h * (0.06 + r() * 0.88))];
    // orthogonal route: start -> (midX, startY) -> (midX, endY) -> end
    const midX = snap(start[0] + (end[0] - start[0]) * (0.25 + r() * 0.5));
    const pts = [start, [midX, start[1]], [midX, end[1]], end];
    const lens = [];
    let total = 0;
    for (let k = 0; k < pts.length - 1; k++) { const d = Math.abs(pts[k + 1][0] - pts[k][0]) + Math.abs(pts[k + 1][1] - pts[k][1]); lens.push(d); total += d; }
    traces.push({ pts, lens, total, speed: 70 + r() * 70, phase: r() * 1200, tail: 110 + r() * 60, end });
  }
  return traces;
}

export function pointAt(tr, d) {
  d = Math.max(0, Math.min(tr.total, d));
  let acc = 0;
  for (let k = 0; k < tr.lens.length; k++) {
    if (d <= acc + tr.lens[k] || k === tr.lens.length - 1) {
      const t = tr.lens[k] ? (d - acc) / tr.lens[k] : 0;
      return [tr.pts[k][0] + (tr.pts[k + 1][0] - tr.pts[k][0]) * t, tr.pts[k][1] + (tr.pts[k + 1][1] - tr.pts[k][1]) * t];
    }
    acc += tr.lens[k];
  }
  return tr.end;
}

function strokeRange(ctx, tr, a, b) {
  ctx.beginPath();
  let p = pointAt(tr, a);
  ctx.moveTo(p[0], p[1]);
  let acc = 0;
  for (let k = 0; k < tr.lens.length; k++) {
    acc += tr.lens[k];
    if (acc > a && acc < b) ctx.lineTo(tr.pts[k + 1][0], tr.pts[k + 1][1]);
  }
  p = pointAt(tr, b);
  ctx.lineTo(p[0], p[1]);
  ctx.stroke();
}

export function startField(canvas, anchorEl, { reducedMotion = () => false } = {}) {
  const ctx = canvas.getContext('2d');
  const host = canvas.parentElement;
  let w = 1, h = 1, dpr = 1, traces = [], raf = 0, visible = true, parallax = 0, dead = false, small = false;
  const cs = getComputedStyle(document.documentElement);
  const col = (n) => cs.getPropertyValue(n).trim();

  function layout() {
    const rect = host.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width)); h = Math.max(1, Math.round(rect.height));
    small = w < 700;
    if (small) parallax = 0;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.ceil(w * dpr); canvas.height = Math.ceil(h * dpr);
    const a = anchorEl.getBoundingClientRect();
    const anchor = { x: a.left - rect.left + a.width / 2, y: a.top - rect.top + a.height / 2, r: Math.max(a.width, a.height) / 2 };
    traces = buildTraces(w, h, anchor, small ? 6 : 12);
    draw(2.2);
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.translate(0, -parallax);
    const accent = col('--accent'), light = col('--accent-light'), line = col('--accent-mid');
    ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    // base traces
    ctx.globalAlpha = 0.32; ctx.strokeStyle = line;
    traces.forEach((tr) => { ctx.beginPath(); tr.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); });
    // corner dots + node pairs
    ctx.fillStyle = light; ctx.globalAlpha = 0.5;
    traces.forEach((tr) => tr.pts.slice(1, -1).forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 1.8, 0, 6.283); ctx.fill(); }));
    ctx.globalAlpha = 0.45; ctx.strokeStyle = accent;
    traces.forEach((tr) => { ctx.beginPath(); ctx.arc(tr.end[0] - 4, tr.end[1], 6, 0, 6.283); ctx.moveTo(tr.end[0] + 10, tr.end[1]); ctx.arc(tr.end[0] + 4, tr.end[1], 6, 0, 6.283); ctx.stroke(); });
    // pulses
    traces.forEach((tr) => {
      const gap = Math.max(260, tr.tail + 60);
      const cycle = tr.total + gap;
      const head = (t * tr.speed + tr.phase) % cycle;
      if (head > tr.total + tr.tail) return;
      for (let k = 0; k < 6; k++) {
        const a = Math.max(0, head - tr.tail * (1 - k / 6)), b = Math.min(tr.total, head - tr.tail * (1 - (k + 1) / 6));
        if (b <= 0 || a >= tr.total || b <= a) continue;
        ctx.globalAlpha = ((k + 1) / 6) * 0.85; ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
        strokeRange(ctx, tr, a, b);
      }
      if (head <= tr.total) {
        const p = pointAt(tr, head);
        ctx.globalAlpha = 0.22; ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = light; ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, 6.283); ctx.fill();
      } else { // arrival: node flares then fades
        const f = (head - tr.total) / tr.tail, g = (1 - f) * (1 - f);
        ctx.globalAlpha = 0.18 * g; ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(tr.end[0], tr.end[1], 26, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 0.8 * g; ctx.strokeStyle = light; ctx.lineWidth = 1.25; ctx.beginPath(); ctx.arc(tr.end[0], tr.end[1], 10 + f * 14, 0, 6.283); ctx.stroke();
      }
      ctx.lineWidth = 1;
    });
    ctx.globalAlpha = 1;
  }

  const t0 = performance.now();
  const frame = () => { raf = 0; if (dead || !visible || document.hidden || reducedMotion()) return; draw(1.2 + (performance.now() - t0) / 1000); raf = requestAnimationFrame(frame); };
  const kick = () => { if (reducedMotion()) { cancelAnimationFrame(raf); raf = 0; draw(2.2); } else if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { cancelAnimationFrame(raf); raf = 0; layout(); kick(); }) : null;
  ro?.observe(host);
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; kick(); }) : null;
  io?.observe(canvas);
  const onVis = () => kick();
  const onScroll = () => { parallax = small ? 0 : Math.max(0, Math.min(48, window.scrollY * 0.07)); if (!raf) draw(2.2); };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('scroll', onScroll, { passive: true });
  layout(); kick();
  return () => { dead = true; cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('scroll', onScroll); };
}
