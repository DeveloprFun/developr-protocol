import { easeOut, usd, int, gwei, pct, shortAddr, esc } from './format.js';
import { groupTokens } from './data.js';
import { COPY } from '../copy.js';
import { DEX_URL } from '../config.js';

// Count-up driven by an injected clock so tests can run on a fast clock.
export function countUp({ from = 0, to, duration = 900, format, onFrame, raf, now }) {
  const start = now();
  const step = () => {
    const t = (now() - start) / duration;
    onFrame(format(from + (to - from) * easeOut(t)));
    if (t < 1) raf(step);
    else onFrame(format(to));
  };
  raf(step);
}

export function sparkPath(series, w = 120, h = 32, pad = 3) {
  if (!series || series.length < 2) return { line: '', area: '' };
  const vs = series.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = max - min || 1;
  const pts = series.map((p, i) => [(i / (series.length - 1)) * w, h - pad - ((p.v - min) / span) * (h - pad * 2)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  return { line, area: `${line}L${w} ${h}L0 ${h}Z` };
}

export const skeletonRows = (n = 8) =>
  Array.from({ length: n }, (_, i) => `<tr class="row sk" style="--i:${i}" aria-hidden="true"><td><span class="shimmer" style="width:${90 + (i % 3) * 20}px"></span></td><td><span class="shimmer" style="width:70px"></span></td><td class="num"><span class="shimmer" style="width:64px"></span></td><td class="num"><span class="shimmer" style="width:52px"></span></td><td class="num"><span class="shimmer" style="width:64px"></span></td></tr>`).join('');

export function renderRows(pairs, mode = 'pools') {
  const rows = mode === 'tokens' ? groupTokens(pairs) : pairs;
  if (!rows.length) return `<tr class="row-msg"><td colspan="5">${COPY.rowsEmpty}</td></tr>`;
  return rows
    .slice(0, 8)
    .map((p, i) => {
      const label = mode === 'tokens' ? `${esc(p.base)}<small>${COPY.pools(p.pools)}</small>` : `${esc(p.base)}<small>/ ${esc(p.quote)}</small>`;
      const href = mode === 'tokens' && p.baseAddress ? DEX_URL(p.baseAddress) : p.url;
      const ch = mode === 'tokens' ? '—' : pct(p.change24h);
      const cls = mode === 'tokens' || p.change24h == null ? '' : p.change24h >= 0 ? 'up' : 'down';
      const venue = mode === 'tokens' ? shortAddr(p.baseAddress ?? '') : `${esc(p.dex)} ${esc(p.version)}`.trim();
      return `<tr class="row" style="--i:${i}"><td class="pair"><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${label}</a></td><td class="venue">${venue}</td><td class="num">${usd(p.liquidity)}</td><td class="num ${cls}">${ch}</td><td class="num">${usd(p.volume24h)}</td></tr>`;
    })
    .join('');
}

// Synthetic, clearly-labelled placeholder posts.
export const SAMPLE_POSTS = Array.from({ length: 8 }, (_, i) => ({
  name: `Sample ${String(i + 1).padStart(2, '0')}`,
  handle: `placeholder_${String(i + 1).padStart(2, '0')}`,
  text: COPY.samples[i % COPY.samples.length],
}));

export function renderMarquee(posts = SAMPLE_POSTS) {
  const card = (p, hidden) =>
    `<figure class="quote"${hidden ? ' aria-hidden="true"' : ''}><p>${esc(p.text)}</p><figcaption class="who"><span class="avatar" aria-hidden="true">${esc(p.name.slice(-2))}</span><span>${esc(p.name)} <small>${esc(p.handle)} · sample</small></span></figcaption></figure>`;
  return posts.map((p) => card(p, false)).join('') + posts.map((p) => card(p, true)).join('');
}

export { usd, int, gwei };
