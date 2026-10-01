import './style.css';
import { REFRESH_MS, SLOW_REFRESH_MS, DEX_URL } from './config.js';
import { caValue } from './register.js';
import { COPY } from './copy.js';
import { fetchTvl, fetchHead, fetchPairs } from './lib/data.js';
import { usd, int, gwei } from './lib/format.js';
import { copyText } from './lib/ca.js';
import { classify, PLACEHOLDER_WORDS, PLACEHOLDER_CADENCE, nextWord } from './lib/analyze.js';
import { countUp, sparkPath, renderRows, renderMarquee, skeletonRows } from './lib/ui.js';
import { startField } from './lib/field.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const raf = (fn) => requestAnimationFrame(fn);
const now = () => performance.now();
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => motion.matches;

document.documentElement.classList.add('js');

// ---- keep sticky offsets honest: CA bar height drives the header offset ----
const ca = $('#ca-slot');
if (ca && typeof ResizeObserver === 'function') {
  new ResizeObserver(() => document.documentElement.style.setProperty('--ca-h', `${ca.offsetHeight}px`)).observe(ca);
}

// ---- reveal on scroll ----
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
);
$$('.reveal').forEach((el) => io.observe(el));

// ---- hero field ----
startField($('#field'), $('#hero-logo'), { reducedMotion: reduced });

// ---- clipboard ----
function flash(el, text, idle) {
  el.textContent = text;
  setTimeout(() => (el.textContent = idle), 1400);
}
if (caValue()) {
  const value = caValue();
  $('.ca-copy')?.addEventListener('click', async () => {
    const ok = await copyText(value, navigator.clipboard);
    flash($('.ca-action'), ok ? COPY.copied : COPY.copyFailed, COPY.caIdle);
  });
}
$('#rpc-copy').addEventListener('click', async (e) => {
  const ok = await copyText(e.currentTarget.dataset.copy, navigator.clipboard);
  flash($('#rpc-state'), ok ? COPY.copied : COPY.copyFailed, COPY.copyIdle);
});

// ---- lookup bar ----
const frame = $('#lookup-frame');
const input = $('#lookup-input');
const msg = $('#lookup-msg');
const ph = $('#lookup-ph');
const word = $('#lookup-word');
let wi = 0;
let phTimer = 0;
let swapTimer = 0;
function rotate() {
  clearInterval(phTimer);
  if (reduced() || PLACEHOLDER_WORDS.length < 2) return;
  phTimer = setInterval(() => {
    if (frame.dataset.filled === 'true') return;
    ph.dataset.shown = 'false';
    swapTimer = setTimeout(() => { wi = nextWord(PLACEHOLDER_WORDS, wi); word.textContent = PLACEHOLDER_WORDS[wi]; ph.dataset.shown = 'true'; }, PLACEHOLDER_CADENCE.swap);
  }, PLACEHOLDER_CADENCE.every);
}
rotate();
input.addEventListener('input', () => {
  const filled = input.value.trim() !== '';
  if (frame.dataset.filled !== String(filled)) frame.dataset.filled = String(filled);
  frame.dataset.bad = 'false';
  msg.textContent = '';
  msg.dataset.tone = '';
});
window.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
  const t = e.target;
  if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
  e.preventDefault();
  input.focus();
});
$('[data-focus]')?.addEventListener('click', (e) => {
  e.preventDefault();
  input.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
  input.focus({ preventScroll: true });
});
$('#lookup').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = classify(input.value);
  if (r.kind !== 'address' && r.kind !== 'poolId') {
    frame.dataset.bad = 'true';
    msg.dataset.tone = 'bad';
    msg.textContent = r.message;
    return;
  }
  const btn = $('button[type="submit"]', e.currentTarget);
  btn.classList.add('busy');
  btn.setAttribute('aria-disabled', 'true');
  msg.dataset.tone = '';
  msg.textContent = r.kind === 'poolId' ? COPY.lookupPoolId : COPY.lookupAddress;
  window.open(DEX_URL(r.id), '_blank', 'noopener,noreferrer');
  setTimeout(() => { btn.classList.remove('busy'); btn.removeAttribute('aria-disabled'); }, 900);
});

// ---- stats ----
const stat = (k) => $(`[data-stat="${k}"] .stat-value`);
function ready(el) { el.classList.remove('skeleton'); el.dataset.state = 'ready'; }
function setStat(k, formatter, value, animate) {
  const el = stat(k);
  ready(el);
  const prev = Number(el.dataset.v ?? 0);
  el.dataset.v = String(value);
  if (!animate || reduced()) { el.textContent = formatter(value); return; }
  countUp({ from: prev, to: Number(value), format: formatter, onFrame: (t) => (el.textContent = t), raf, now });
}
function failStat(k) {
  const el = stat(k);
  el.classList.remove('skeleton');
  el.dataset.state = 'error';
  el.textContent = COPY.unavailable;
}

let firstTvl = true;
async function loadTvl() {
  const r = await fetchTvl();
  if (!r.ok) return failStat('tvl');
  setStat('tvl', usd, r.tvl, firstTvl);
  firstTvl = false;
  const { line, area } = sparkPath(r.series.slice(-90));
  $('#spark-tvl').innerHTML = `<path class="area" d="${area}"/><path d="${line}"/>`;
}

let firstHead = true;
async function loadHead() {
  const r = await fetchHead();
  const dot = $('#live-dot');
  if (!r.ok) { dot.dataset.state = 'down'; if (firstHead) { failStat('block'); failStat('gas'); } return; }
  dot.dataset.state = 'live';
  for (const [k, text] of [['block', int(r.block)], ['gas', gwei(r.gasWei)]]) { const el = stat(k); ready(el); el.textContent = text; }
  firstHead = false;
}

// ---- markets ----
let pairs = [];
let tab = 'pools';
const body = $('#market-body');
body.innerHTML = skeletonRows();
const paint = () => { body.innerHTML = renderRows(pairs, tab); };
async function loadMarkets() {
  const r = await fetchPairs();
  $('#market-panel').setAttribute('aria-busy', 'false');
  if (!r.ok) {
    if (!pairs.length) {
      failStat('volume');
      body.innerHTML = `<tr class="row-msg"><td colspan="5">${COPY.rowsError}<button class="retry" type="button" id="retry">${COPY.retry}</button></td></tr>`;
      $('#retry').addEventListener('click', () => { body.innerHTML = skeletonRows(); loadMarkets(); });
    }
    return;
  }
  pairs = r.pairs;
  setStat('volume', usd, r.totalVolume24h, true);
  paint();
}
$$('.tab').forEach((b) =>
  b.addEventListener('click', () => {
    tab = b.dataset.tab;
    $$('.tab').forEach((t) => { const on = t === b; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $('#market-panel').setAttribute('aria-labelledby', b.id);
    if (pairs.length) paint();
  }),
);
$('.tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const tabs = $$('.tab');
  const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
  n.click(); n.focus();
});

// ---- marquee ----
$('#marquee').innerHTML = renderMarquee();

// ---- boot + refresh (visible tabs only; also refresh on return, like the reference) ----
const slow = () => { loadTvl(); loadMarkets(); };
loadTvl(); loadHead(); loadMarkets();
setInterval(() => { if (!document.hidden) loadHead(); }, REFRESH_MS);
setInterval(() => { if (!document.hidden) slow(); }, SLOW_REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadHead(); slow(); } });
