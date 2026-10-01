// Gates: 30 max. Synthetic fixtures only. Fast clock (no real waiting). Network is never touched;
// the layout gate drives a local static server + the system Edge/Chrome at the five breakpoints.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...a) => join(root, ...a);
const rd = (f) => readFileSync(p(f), 'utf8');

const { parseLlamaTvl, parseHead, parsePairs, groupTokens, fetchTvl, fetchHead, fetchPairs } = await import('../src/lib/data.js');
const F = await import('../src/lib/format.js');
const { renderCa, copyText } = await import('../src/lib/ca.js');
const { renderSocial } = await import('../src/lib/social.js');
const { countUp, sparkPath, renderRows, renderMarquee, skeletonRows } = await import('../src/lib/ui.js');
const { classify, PLACEHOLDER_CADENCE, PLACEHOLDER_WORDS, nextWord } = await import('../src/lib/analyze.js');
const { buildTraces, pointAt } = await import('../src/lib/field.js');
const R = await import('../src/register.js');
const { COPY } = await import('../src/copy.js');
const cfg = await import('../src/config.js');
const { decode } = await import('./lib/image.mjs');
const { measure, BREAKPOINTS } = await import('./measure.mjs');

const gates = [];
const gate = (name, fn) => gates.push([name, fn]);
const ok = (c, m) => { if (!c) throw new Error(m); };
const eq = (a, b, m = '') => { if (a !== b) throw new Error(`${m} expected ${String(b)} got ${String(a)}`); };
const throws = (fn, m) => { let t = false; try { fn(); } catch { t = true; } ok(t, m); };

const html = existsSync(p('dist/index.html')) ? rd('dist/index.html') : '';
const assetsDir = p('dist/assets');
const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
const css = assets.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');
const js = assets.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');
const tokensCss = rd('src/tokens.css');

// ---- helpers ----
const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    if (['node_modules', '.git', 'package-lock.json'].includes(n)) continue;
    const f = join(dir, n);
    statSync(f).isDirectory() ? walk(f, out) : out.push(f);
  }
  return out;
};
const TEXT_EXT = new Set(['.js', '.mjs', '.json', '.css', '.html', '.md', '.svg', '.txt']);
const textFiles = () => walk(root).filter((f) => TEXT_EXT.has(extname(f)));

const tokenRows = [...tokensCss.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});\s*\/\*\s*(.+?)\s{2}\((\d+), (\d+)\)\s{2}(.+?)\s*\*\//g)]
  .map((m) => ({ name: m[1], hex: m[2].toLowerCase(), file: m[3], x: +m[4], y: +m[5], how: m[6] }));

const imgCache = new Map();
const img = (f) => { if (!imgCache.has(f)) imgCache.set(f, decode(p(f))); return imgCache.get(f); };
const pixelHex = (im, x, y) => { const i = (y * im.width + x) * 4; return '#' + [0, 1, 2].map((k) => im.data[i + k].toString(16).padStart(2, '0')).join(''); };

// ---- originality (hashed reference corpus: web reference + slides) ----
const REF = JSON.parse(rd('scripts/ref-hashes.json'));
const refBi = new Set(REF.bigrams);
const refUni = new Set(REF.slideWords);
const h12 = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);
const tok = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const STOP = new Set('a an the of to in on at by for with and or but is are was were be been it its as that this these those from into than then so you your we our us i me my if not no will can do does did what when who whom which how why also just more most very about over under out up down off one each every any all some such only own same too both here there their them they he she his her him'.split(' '));
const ENTITY = new Set(['developr', 'uniswap', 'defi', 'robinhood', 'chain', 'fun', '4663', 'eth', 'rpc', 'usd']);
function siteCopy() {
  const body = html.slice(html.indexOf('<body'));
  const attrs = [...html.matchAll(/\b(?:alt|aria-label|placeholder|content|title)="([^"]+)"/g)].map((m) => m[1]).filter((t) => !/^#|^\.\/|width=|^https?:/.test(t));
  const vis = body.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
  const dyn = [...Object.values(COPY).filter((v) => typeof v === 'string'), ...COPY.samples, ...PLACEHOLDER_WORDS, COPY.pools(1), COPY.pools(2),
    ...['', '0x', '0x12', '0x' + 'a'.repeat(50), '0x' + 'a'.repeat(70), 'zz', '12'].map((s) => classify(s).message)];
  return [vis, ...attrs, ...dyn].join(' \n ');
}

// ================= BUILD OUTPUT =================
gate('build output: html, css, js, logo, favicons, cover, font', () => {
  ok(html.length > 2000 && css && js, 'missing html/css/js');
  for (const f of ['logo.png', 'favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'cover.jpg', 'fonts/montserrat-latin.woff2']) ok(existsSync(p('dist', f)), `dist/${f}`);
  ok(/rel="icon"[^>]*favicon\.svg/.test(html) && /apple-touch-icon/.test(html), 'icons not linked');
});

gate('REGISTER: every external fact is one record with a valid state', () => {
  R.assertRegister();
  for (const [k, r] of Object.entries(R.REGISTER)) ok(Object.keys(r).every((x) => !/handle/i.test(x)), `${k}: handle stored (LINK RULE)`);
  for (const k of ['x', 'github', 'launch']) eq(R.REGISTER[k].state, 'absent', k);
  ok(['absent', 'stated'].includes(R.REGISTER.ca.state), 'ca must be absent or stated (never unconfirmed-with-value)');
  eq(R.REGISTER.chainId.value, 4663); eq(R.REGISTER.rackSlots.state, 'unconfirmed');
  throws(() => R.assertRegister({ a: { label: 'a', state: 'stated', value: null } }), 'stated without value accepted');
  throws(() => R.assertRegister({ a: { label: 'a', state: 'absent', value: 'x' } }), 'absent with value accepted');
  throws(() => R.assertRegister({ a: { label: 'a', state: 'maybe', value: null } }), 'bad state accepted');
  throws(() => R.assertRegister({ a: { label: 'a', state: 'stated', kind: 'address', value: '0x123' } }), 'short address accepted as stated');
});

gate('LINK RULE: no href unless stated; handle derived from stored URL', () => {
  const fake = (state, value) => ({ x: { label: 'X', state, kind: 'url', value } });
  eq(R.linkFor('x', fake('absent', null)), null); eq(R.linkFor('x', fake('unconfirmed', 'https://x.com/Nope')), null);
  eq(R.linkFor('x', fake('stated', 'https://x.com/Developr_Fun')), 'https://x.com/Developr_Fun');
  eq(R.handleFromUrl('https://x.com/Developr_Fun'), '@Developr_Fun'); eq(R.handleFromUrl('not a url'), null);
  const live = renderSocial('x', fake('stated', 'https://x.com/Developr_Fun'));
  ok(live.includes('href="https://x.com/Developr_Fun"') && live.includes('@Developr_Fun') && live.includes('noopener'), 'stated link');
  const dead = renderSocial('x', fake('unconfirmed', 'https://x.com/Nope')); ok(!dead.includes('href') && dead.includes('aria-disabled'), 'unconfirmed must be inert');
  const s = html.match(/<div class="socials"[\s\S]*?<\/div>/)?.[0] ?? '';
  ok(!/href=/.test(s) && (s.match(/aria-disabled="true"/g) ?? []).length === 2, 'built socials not inert');
});

gate('CA slot: first in body, sticky; inert + undated if absent, full copyable address if stated', () => {
  const body = html.slice(html.indexOf('<body'));
  ok(body.indexOf('id="ca-slot"') > -1 && body.indexOf('id="ca-slot"') < body.indexOf('<header'), 'CA not before header');
  const slot = html.match(/<div class="ca"[\s\S]*?<\/div>/)?.[0] ?? '';
  if (R.caValue() === null) {
    ok(/data-state="absent"/.test(slot) && /aria-disabled="true"/.test(slot), 'not inert');
    ok(!/<(a|button)\b/.test(slot) && !/<time|\d{4}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(slot.replace(/<[^>]+>/g, ' ')), 'interactive or dated');
  } else {
    const ca = R.caValue();
    ok(/data-state="set"/.test(slot) && !/aria-disabled/.test(slot), 'stated CA should be live');
    ok(slot.includes(`>${ca}</button>`) && slot.includes(`data-copy="${ca}"`), 'full address + copy target');
    ok(!/<time|\b20\d\d\b/.test(slot.replace(ca, '')), 'CA slot must not carry a date');
  }
  ok(/\.ca\{[^}]*position:sticky[^}]*top:0/.test(css.replace(/\s+/g, '')), 'not sticky at top:0');
});

gate('CA slot stated (synthetic): full 42-char address, click-to-copy, copy works', async () => {
  const addr = '0x' + 'AbC123'.repeat(6) + 'abcd'; eq(addr.length, 42);
  const reg = { ca: { label: 'CA', state: 'stated', kind: 'address', value: addr } };
  R.assertRegister(reg);
  const s = renderCa(R.caValue(reg));
  ok(s.includes(`>${addr}</button>`) && s.includes(`data-copy="${addr}"`) && s.includes('ca-action'), 'full address / copy target');
  eq(renderCa(R.caValue({ ca: { ...reg.ca, state: 'unconfirmed' } })).includes('<button'), false, 'unconfirmed CA got a copy button');
  throws(() => renderCa('0x123'), 'invalid CA accepted');
  let got = ''; eq(await copyText(addr, { writeText: async (v) => { got = v; } }), true); eq(got, addr);
  eq(await copyText(addr, { writeText: async () => { throw new Error('denied'); } }), false);
});

gate('socials: icon-only and at the far right of the header', () => {
  const s = html.match(/<div class="socials"[\s\S]*?<\/div>/)?.[0] ?? '';
  ok(s.includes('data-social="x"') && s.includes('data-social="github"'), 'missing icons');
  eq(s.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim(), '', 'visible text');
  const hdr = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
  ok(hdr.lastIndexOf('class="socials"') > hdr.lastIndexOf('</nav>'), 'socials not after nav');
  ok(/\.header-row\{[^}]*justify-content:space-between/.test(css.replace(/\s+/g, '')), 'header not spaced between');
});

// ================= PALETTE =================
gate('PALETTE RULE: colour literals live only in tokens.css', () => {
  const exempt = new Set(['src/tokens.css', 'public/favicon.svg', 'brand/palette.json', 'brand/PROVENANCE.md', 'dist/favicon.svg']);
  const lit = /(?<![&\w])#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/g;
  const named = /(?:color|background|fill|stroke|border[\w-]*|outline[\w-]*|shadow)\s*:[^;{}]*\b(?:black|white|red|blue|green|gray|grey|yellow|orange|purple|pink|magenta|cyan|gold|silver|navy|teal|maroon)\b/i;
  const bad = [];
  for (const f of textFiles()) {
    const rel = relative(root, f).replace(/\\/g, '/');
    if (exempt.has(rel) || rel.startsWith('scripts/') || rel.startsWith('dist/assets/') || rel === 'dist/index.html' || rel.startsWith('node_modules')) continue;
    const t = readFileSync(f, 'utf8');
    if (lit.test(t) || named.test(t)) bad.push(rel);
    lit.lastIndex = 0;
  }
  ok(!bad.length, `literals outside tokens.css: ${bad}`);
  const tokenHex = new Set(tokenRows.map((r) => r.hex));
  const used = [...new Set((css + html).match(/(?<![&\w])#[0-9a-fA-F]{6}\b/g) ?? [])].map((h) => h.toLowerCase());
  ok(used.every((h) => tokenHex.has(h)), `dist uses a colour not in tokens.css: ${used.filter((h) => !tokenHex.has(h))}`);
  ok(tokenRows.length >= 14, 'token rows missing');
});

gate('palette provenance: every token IS the real pixel at its recorded (x, y)', () => {
  for (const r of tokenRows) {
    const f = r.file; ok(/^(brand|reference)\//.test(f) && existsSync(p(f)), `${r.name}: source ${f}`);
    const im = img(f); ok(r.x < im.width && r.y < im.height, `${r.name}: out of bounds`);
    eq(pixelHex(im, r.x, r.y), r.hex, `${r.name} @ ${f} (${r.x},${r.y})`);
  }
});

gate('premultiplied resize: logo edge pixels stay on the brand colour ramp', () => {
  const src = img('brand/LOGO DEVELOPR PNG...png');
  let tb = 0; for (let i = 0; i < src.data.length; i += 4) if (src.data[i + 3] === 0 && !src.data[i] && !src.data[i + 1] && !src.data[i + 2]) tb++;
  ok(tb > 1e6, 'source should contain pure-black transparent regions'); eq(JSON.parse(rd('brand/palette.json')).premultipliedResize, true);
  const out = decode(p('public/logo.png'));
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const floor = Math.min(...tokenRows.filter((t) => t.name.startsWith('accent')).map((t) => lum(...[1, 3, 5].map((k) => parseInt(t.hex.slice(k, k + 2), 16))))) * 0.8;
  let edge = 0;
  for (let i = 0; i < out.data.length; i += 4) { const a = out.data[i + 3]; if (a > 12 && a < 250) { edge++; ok(lum(out.data[i], out.data[i + 1], out.data[i + 2]) >= floor, 'dark fringe on logo edge'); } }
  ok(edge > 50, 'no edge pixels found');
});

gate('favicon.svg is the logo pixel grid: 32x32, fills are real logo pixels', () => {
  const svg = rd('public/favicon.svg'); ok(/viewBox="0 0 32 32"/.test(svg), 'viewBox');
  const fills = [...new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((m) => m[1]))];
  ok(fills.length >= 5 && fills.length <= 12, `fills ${fills.length}`);
  const im = img('brand/LOGO DEVELOPR PNG...png'), seen = new Set();
  for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3] === 255) seen.add('#' + [0, 1, 2].map((k) => im.data[i + k].toString(16).padStart(2, '0')).join(''));
  for (const f of fills) ok(seen.has(f), `${f} is not a pixel in the logo`);
  for (const m of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)"/g)) ok(+m[1] + +m[3] <= 32 && +m[2] < 32, 'rect out of grid');
  const png = decode(p('public/favicon.png')); eq(png.width, 48);
});

// ================= COPY =================
gate('originality: zero shared content bigrams, zero slide vocabulary', () => {
  const text = siteCopy(); const w = tok(text); ok(w.length > 450, `copy too short (${w.length} words)`);
  const shared = []; const words = [];
  for (let i = 0; i < w.length - 1; i++) {
    const [a, b] = [w[i], w[i + 1]];
    if (STOP.has(a) && STOP.has(b)) continue;
    if (ENTITY.has(a) || ENTITY.has(b)) { if (ENTITY.has(a) && ENTITY.has(b)) continue; }
    if (refBi.has(h12(`${a} ${b}`))) shared.push(`${a} ${b}`);
  }
  for (const x of new Set(w)) if (!STOP.has(x) && !ENTITY.has(x) && refUni.has(h12(x))) words.push(x);
  ok(!shared.length, `shared 2-grams: ${[...new Set(shared)].join(' | ')}`);
  ok(!words.length, `slide vocabulary reused: ${words.join(', ')}`);
});

gate('all reference sections present; chain constants (4663 + RPC) wired', () => {
  for (const id of ['top', 'stats', 'rack', 'markets', 'paths', 'sources', 'voices', 'who', 'flow', 'faq', 'lookup', 'field']) ok(html.includes(`id="${id}"`), id);
  ok((html.match(/<details/g) ?? []).length >= 5, 'faq items');
  eq(cfg.CHAIN.id, 4663); eq(cfg.CHAIN.rpc, 'https://rpc.mainnet.chain.robinhood.com');
  ok(html.includes('4663') && html.includes('rpc.mainnet.chain.robinhood.com'), 'not in html');
});

// ================= BEHAVIOUR (reference motion) =================
gate('motion contract: timings, easing, reduced-motion, "/" shortcut', () => {
  eq(PLACEHOLDER_CADENCE.every, 2600); eq(PLACEHOLDER_CADENCE.swap, 240);
  eq(nextWord(PLACEHOLDER_WORDS, PLACEHOLDER_WORDS.length - 1), 0);
  const c = css.replace(/\s+/g, '');
  ok(/--ease-settle:cubic-bezier\(\.?0?\.22,1,\.?0?\.36,1\)/.test(c), 'ease-settle'); ok(/--motion-slow:\.?0?\.32s/.test(c) && /--motion-base:\.?0?\.2s/.test(c), 'motion tokens');
  ok(/prefers-reduced-motion:reduce/.test(c), 'reduced motion'); ok(/@keyframes(sweep|shimmer|fill|ping)/.test(c), 'keyframes');
  ok(js.includes('"/"') && /visibilitychange/.test(js) && /IntersectionObserver/.test(js), 'shortcut / observers');
});

gate('GATE WARNING: lookup accepts 0x hex of every valid length, never blanket-rejects 0x', () => {
  const a = '0x' + 'a'.repeat(40), pid = '0x' + 'F3'.repeat(32);
  eq(classify(a).kind, 'address'); eq(classify(pid).kind, 'poolId'); eq(classify('0X' + 'aB'.repeat(20)).kind, 'address'); eq(classify(`  ${a}  `).kind, 'address');
  for (const n of [1, 12, 39, 41, 63]) { const r = classify('0x' + 'a'.repeat(n)); eq(r.kind, 'partial', `len ${n}`); ok(/\d/.test(r.message) && !/not allowed|rejected|invalid/i.test(r.message), 'message should give lengths'); }
  eq(classify('0x' + 'a'.repeat(70)).kind, 'invalid'); eq(classify('0xZZ').kind, 'invalid'); eq(classify('hello').kind, 'invalid'); eq(classify('').kind, 'empty');
});

gate('format: usd / pct / int / gwei / esc / addresses', () => {
  eq(F.usd(1_024_906_532), '$1.02B'); eq(F.usd(NaN), '—'); eq(F.usd(0.5), '$0.5000'); eq(F.pct(3.456), '+3.46%'); eq(F.pct(-2), '-2.00%');
  eq(F.int(1234567n), '1,234,567'); eq(F.gwei(20_000_000n), '0.0200'); eq(F.gwei(25_000_000_000n), '25.0');
  eq(F.esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  ok(F.isAddress('0x' + 'a'.repeat(40)) && !F.isAddress('0x' + 'a'.repeat(39)) && F.isTxHash('0x' + 'f'.repeat(64)));
});

const FIX = {
  llama: [{ date: 1, tvl: 10 }, { date: 2, tvl: 20 }, { date: 3, tvl: 30 }],
  rpc: [{ jsonrpc: '2.0', id: 2, result: '0x3b9aca00' }, { jsonrpc: '2.0', id: 1, result: '0x10' }],
  dex: { pairs: [
    { chainId: 'robinhood', dexId: 'uniswap', labels: ['v4'], url: 'https://x/a', pairAddress: '0xa', baseToken: { symbol: 'AAA', address: '0x' + 'a'.repeat(40) }, quoteToken: { symbol: 'ETH' }, priceUsd: '1', liquidity: { usd: 100 }, volume: { h24: 10 }, priceChange: { h24: 5 } },
    { chainId: 'robinhood', dexId: 'uniswap', labels: ['v3'], url: 'https://x/b', pairAddress: '0xb', baseToken: { symbol: 'BBB', address: '0x' + 'b'.repeat(40) }, quoteToken: { symbol: 'ETH' }, priceUsd: '2', liquidity: { usd: 900 }, volume: { h24: 30 }, priceChange: { h24: -2 } },
    { chainId: 'robinhood', dexId: 'uniswap', labels: ['v4'], url: 'https://x/c', pairAddress: '0x' + 'c'.repeat(64), baseToken: { symbol: 'BBB', address: '0x' + 'b'.repeat(40) }, quoteToken: { symbol: 'USDC' }, priceUsd: '2', liquidity: { usd: 100 }, volume: { h24: 5 }, priceChange: { h24: 0 } },
    { chainId: 'ethereum', dexId: 'other', baseToken: { symbol: 'ZZZ' }, quoteToken: { symbol: 'ETH' }, liquidity: { usd: 1e9 } },
  ] },
};
const okFetch = (body) => async () => ({ ok: true, status: 200, json: async () => body });
const badFetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
const throwFetch = async () => { throw new Error('offline'); };

gate('parsers: llama tvl, rpc batch (bigint), dexscreener filter/sort/group', () => {
  const l = parseLlamaTvl(FIX.llama); eq(l.tvl, 30); eq(l.series.length, 3);
  for (const bad of [null, {}, [], [{ date: 'x', tvl: 1 }]]) throws(() => parseLlamaTvl(bad), 'llama bad payload');
  const h = parseHead(FIX.rpc); eq(h.block, 16n); eq(h.gasWei, 1_000_000_000n);
  throws(() => parseHead([{ id: 1, error: {} }, { id: 2, result: '0x1' }]), 'rpc error'); throws(() => parseHead([{ id: 1, result: 'zz' }, { id: 2, result: '0x1' }]), 'bad hex');
  const d = parsePairs(FIX.dex); eq(d.total, 3); eq(d.pairs[0].base, 'BBB'); eq(d.totalVolume24h, 45); eq(d.pairs[0].version, 'v3');
  const t = groupTokens(d.pairs); eq(t.length, 2); eq(t[0].pools, 2); eq(t[0].liquidity, 1000);
});

gate('fetchers: success, HTTP error and network throw -> {ok:false}', async () => {
  eq((await fetchTvl(okFetch(FIX.llama))).tvl, 30); eq((await fetchHead(okFetch(FIX.rpc))).block, 16n); eq((await fetchPairs(okFetch(FIX.dex))).total, 3);
  for (const f of [fetchTvl, fetchHead, fetchPairs]) { eq((await f(badFetch)).ok, false, 'http'); eq((await f(throwFetch)).ok, false, 'throw'); }
});

gate('fast clock: countUp lands exactly; traces are orthogonal, deterministic, in bounds', () => {
  let t = 0, last = null; const q = [];
  countUp({ from: 0, to: 500, duration: 100, format: (n) => Math.round(n), onFrame: (v) => (last = v), raf: (f) => q.push(f), now: () => t });
  while (q.length) { t += 40; q.shift()(); } eq(last, 500);
  const a = buildTraces(1200, 700, { x: 900, y: 350, r: 120 }, 12), b = buildTraces(1200, 700, { x: 900, y: 350, r: 120 }, 12);
  eq(JSON.stringify(a), JSON.stringify(b), 'not deterministic');
  for (const tr of a) {
    for (let k = 0; k < tr.pts.length - 1; k++) ok(tr.pts[k][0] === tr.pts[k + 1][0] || tr.pts[k][1] === tr.pts[k + 1][1], 'diagonal segment');
    const s = pointAt(tr, 0), e = pointAt(tr, tr.total); ok(s[0] === tr.pts[0][0] && e[0] === tr.end[0] && e[1] === tr.end[1], 'pointAt ends');
  }
});

gate('rendering: sparkline, rows (pools/tokens/empty/skeleton), escaping, sample voices', () => {
  const sp = sparkPath(FIX.llama.map((r) => ({ t: r.date, v: r.tvl }))); ok(sp.line.startsWith('M') && sp.area.endsWith('Z')); eq(sparkPath([]).line, '');
  const pairs = parsePairs(FIX.dex).pairs;
  ok(renderRows(pairs, 'pools').includes('BBB') && renderRows(pairs, 'tokens').includes('2 pools') && renderRows([], 'pools').includes(COPY.rowsEmpty));
  ok(!renderRows([{ ...pairs[0], base: '<img onerror=1>' }], 'pools').includes('<img'));
  eq((skeletonRows(8).match(/class="row sk"/g) ?? []).length, 8);
  const m = renderMarquee(); ok(/sample/i.test(m) && /aria-hidden="true"/.test(m));
});

// ================= HYGIENE / ENV =================
gate('REPO HYGIENE: no agent-config files, no .git, no AI attribution anywhere', () => {
  for (const f of [['CLA', 'UDE.md'].join(''), ['.cla', 'ude'].join(''), '.git']) ok(!existsSync(p(f)), `${f} exists`);
  const pats = [['Cla', 'ude'], ['Anthro', 'pic'], ['Co-Authored', '-By'], ['Generated ', 'with'], ['AI-', 'generated']].map((a) => new RegExp(a.join(''), 'i'));
  const hits = [];
  for (const f of textFiles()) { const t = readFileSync(f, 'utf8'); if (pats.some((r) => r.test(t))) hits.push(relative(root, f)); }
  ok(!hits.length, `attribution found in: ${hits}`);
});

gate('no third-party scripts/fonts; network hosts allow-listed', () => {
  ok(!/<script[^>]+src="https?:/.test(html) && !/<link[^>]+href="https?:/.test(html) && !/fonts\.googleapis/.test(html + css), 'external tag');
  const hosts = [...new Set((js.match(/https?:\/\/[a-z0-9.-]+/gi) ?? []).map((u) => u.replace(/^https?:\/\//, '').toLowerCase()))];
  const bad = hosts.filter((h) => !['api.llama.fi', 'rpc.mainnet.chain.robinhood.com', 'api.dexscreener.com', 'dexscreener.com', 'www.w3.org'].includes(h));
  ok(!bad.length, `unexpected hosts: ${bad}`);
});

gate(`layout @ ${BREAKPOINTS.map((b) => b[0]).join('/')}: no overflow, 48px tap targets, CA pinned`, async () => {
  const out = await measure();
  ok(!out.skipped, 'no Edge/Chrome found; cannot verify layout (set BROWSER_PATH)');
  eq(out.results.length, 5, 'breakpoints measured');
  for (const r of out.results) {
    ok(!r.overflowX && r.scrollW <= r.vw, `${r.w}: horizontal overflow (scrollW ${r.scrollW})`);
    ok(!r.wide.length, `${r.w}: element past viewport ${r.wide}`);
    ok(!r.small.length, `${r.w}: tap targets < 48px: ${r.small}`);
    ok(r.caPinned && r.caH >= 48, `${r.w}: CA not pinned / short (${r.caH})`);
  }
});

// ---- run (max 30); ONLY=<substring> runs a subset while iterating ----
ok(gates.length <= 30, `too many gates: ${gates.length}`);
let failed = 0;
for (const [name, fn] of gates.filter(([n]) => !process.env.ONLY || n.includes(process.env.ONLY))) {
  try { await fn(); console.log(`PASS  ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); }
}
console.log(`\n${gates.length - failed}/${gates.length} gates passed`);
process.exit(failed ? 1 : 0);
