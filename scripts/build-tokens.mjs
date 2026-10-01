// Samples the palette from the real brand/ and reference/ pixels and writes:
//   src/tokens.css        (the ONLY file allowed to hold colour literals)
//   public/logo.png, favicon.png, apple-touch-icon.png, favicon.svg  (from the logo pixel grid)
//   brand/palette.json, brand/PROVENANCE.md
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, alphaStats, kmeans, hsl, lum, toHex, resizePremul, bbox, crop, encodePng } from './lib/image.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => join(root, ...a);
const F = {
  logoAlpha: 'brand/LOGO DEVELOPR PNG...png',
  logoDark: 'brand/LOGO DEVELOPR PNG.png',
  slide1: 'reference/DEVELOPR 1.jpg.jpeg',
  slide2: 'reference/DEVELOPR 2.jpg.jpeg',
  cover: 'reference/SAMPUL DEVELOPR JPG.jpg.jpeg',
};
const img = Object.fromEntries(Object.entries(F).map(([k, v]) => [k, decode(P(v))]));

// ---- sampling -------------------------------------------------------------
const src = (file, c, how) => ({ hex: c.hex, file: c.file ?? file, x: c.x, y: c.y, how });
const logoK = kmeans(img.logoAlpha, 8);      // opaque logo pixels only (alpha >= 250)
const darkK = kmeans(img.logoDark, 8);
const tag = (k, file) => k.map((c) => ({ ...c, file }));
const slideK = tag(kmeans(img.slide1, 10), F.slide1);
const slideK2 = tag(kmeans(img.slide2, 10), F.slide2);

const chromatic = (k) => k.filter((c) => hsl(c.rgb).s > 0.6 && hsl(c.rgb).l > 0.1);
const logoChroma = chromatic(logoK);
const accent = logoChroma[0];                                                    // largest face colour
const accentLight = [...logoChroma].sort((a, b) => lum(b.rgb) - lum(a.rgb))[0];  // brightest bevel
const accentMid = logoChroma.find((c) => c !== accent && lum(c.rgb) < lum(accent.rgb) && lum(c.rgb) > 40);
const accentDeep = [...logoChroma].sort((a, b) => lum(a.rgb) - lum(b.rgb))[0];
const ground = slideK[0];                                                        // slide ground (dominant)
const logoGround = darkK[0];                                                     // logo plate purple
const text = [...slideK, ...slideK2].sort((a, b) => lum(b.rgb) - lum(a.rgb))[0]; // slide body text
const muted = slideK.concat(slideK2).filter((c) => hsl(c.rgb).s < 0.2 && lum(c.rgb) > 90 && lum(c.rgb) < 170).sort((a, b) => b.share - a.share)[0];
const wordmark = slideK.concat(slideK2).filter((c) => hsl(c.rgb).s > 0.6 && lum(c.rgb) > 120 && c.hex !== accentLight.hex).sort((a, b) => lum(b.rgb) - lum(a.rgb))[0];

// Hue-window sampling on the cover for the five block colours: k-means (k=3) on pixels in the window.
function windowPick(image, [h0, h1], { sMin = 0.6, lMin = 0.3, lMax = 0.62 } = {}) {
  const { data, width, height } = image;
  const keep = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const h = hsl([data[i], data[i + 1], data[i + 2]]);
    if (h.s >= sMin && h.l >= lMin && h.l <= lMax && h.h >= h0 && h.h <= h1) { keep[i] = data[i]; keep[i + 1] = data[i + 1]; keep[i + 2] = data[i + 2]; keep[i + 3] = 255; }
  }
  return kmeans({ data: keep, width, height }, 3, { minAlpha: 255 })[0];
}
const blocks = {
  blue: windowPick(img.cover, [195, 225]),
  orange: windowPick(img.cover, [22, 34]),
  red: windowPick(img.cover, [0, 8], { lMin: 0.35 }),
  green: windowPick(img.cover, [105, 145], { lMin: 0.3 }),
  gold: windowPick(img.cover, [38, 50]),
};

// ---- logo assets (premultiplied resize: transparent regions are pure black in the source) ----
const alpha = alphaStats(img.logoAlpha);
const premul = alpha.transparentBlack > 0;
const box = bbox(img.logoAlpha);
const side = Math.max(box.w, box.h);
const cropped = crop(img.logoAlpha, box);
function square(im, s) {
  const out = new Uint8ClampedArray(s * s * 4); // transparent (premultiplied-safe: rgb 0 + alpha 0 is never averaged in)
  const ox = Math.floor((s - im.width) / 2), oy = Math.floor((s - im.height) / 2);
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const a = (y * im.width + x) * 4, b = ((y + oy) * s + x + ox) * 4;
    out.set(im.data.subarray(a, a + 4), b);
  }
  return { width: s, height: s, data: out };
}
const sq = square(cropped, side);
const logo192 = resizePremul(sq, 192, 192);
writeFileSync(P('public/logo.png'), encodePng(logo192));
const pad = (im, s, inner) => { // centre `inner`-sized logo on an s-square transparent canvas
  const small = resizePremul(sq, inner, inner);
  const out = new Uint8ClampedArray(s * s * 4), o = Math.floor((s - inner) / 2);
  for (let y = 0; y < inner; y++) for (let x = 0; x < inner; x++) out.set(small.data.subarray((y * inner + x) * 4, (y * inner + x) * 4 + 4), ((y + o) * s + x + o) * 4);
  return { width: s, height: s, data: out };
};
writeFileSync(P('public/favicon.png'), encodePng(resizePremul(sq, 48, 48)));
// apple-touch: logo on the real logo-plate colour (iOS flattens transparency to black otherwise)
{
  const s = 180, inner = 132, o = (s - inner) / 2, small = resizePremul(sq, inner, inner);
  const out = new Uint8ClampedArray(s * s * 4);
  for (let i = 0; i < s * s; i++) out.set([...logoGround.rgb, 255], i * 4);
  for (let y = 0; y < inner; y++) for (let x = 0; x < inner; x++) {
    const p = (y * inner + x) * 4, q = ((y + o) * s + x + o) * 4, a = small.data[p + 3] / 255;
    for (let c = 0; c < 3; c++) out[q + c] = small.data[p + c] * a + out[q + c] * (1 - a);
  }
  writeFileSync(P('public/apple-touch-icon.png'), encodePng({ width: s, height: s, data: out }));
}

// favicon.svg: 32x32 pixel grid from the logo; each cell snapped to the nearest REAL logo colour.
const grid = resizePremul(sq, 32, 32);
const pal = logoK.map((c) => c.rgb);
const snap = (rgb) => pal.reduce((b, c) => (((c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2) < b.d ? { c, d: (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2 } : b), { c: pal[0], d: Infinity }).c;
const rects = [];
for (let y = 0; y < 32; y++) {
  let x = 0;
  while (x < 32) {
    const i = (y * 32 + x) * 4, a = grid.data[i + 3];
    if (a < 24) { x++; continue; }
    const col = toHex(snap([grid.data[i], grid.data[i + 1], grid.data[i + 2]])), op = Math.round((a / 255) * 4) / 4;
    let run = 1;
    while (x + run < 32) {
      const j = (y * 32 + x + run) * 4;
      if (grid.data[j + 3] < 24) break;
      if (toHex(snap([grid.data[j], grid.data[j + 1], grid.data[j + 2]])) !== col || Math.round((grid.data[j + 3] / 255) * 4) / 4 !== op) break;
      run++;
    }
    rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${col}"${op < 1 ? ` fill-opacity="${op}"` : ''}/>`);
    x += run;
  }
}
writeFileSync(P('public/favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><!-- generated by scripts/build-tokens.mjs from brand/LOGO DEVELOPR PNG...png (32x32 pixel grid, real logo colours) -->\n${rects.join('')}\n</svg>\n`);

// ---- tokens.css -----------------------------------------------------------
const row = (name, s) => `  --${name}: ${s.hex}; /* ${s.file}  (${s.x}, ${s.y})  ${s.how} */`;
const T = {
  ground: src(F.slide1, ground, 'k-means k=10, dominant cluster, snapped to real pixel'),
  plate: src(F.logoDark, logoGround, 'k-means k=8, dominant cluster, snapped to real pixel'),
  accent: src(F.logoAlpha, accent, 'k-means k=8 over opaque pixels, largest chromatic cluster'),
  'accent-light': src(F.logoAlpha, accentLight, 'k-means k=8, brightest chromatic cluster (top bevel)'),
  'accent-mid': src(F.logoAlpha, accentMid, 'k-means k=8, left-face cluster'),
  'accent-deep': src(F.logoAlpha, accentDeep, 'k-means k=8, darkest chromatic cluster (under-bevel)'),
  wordmark: src(F.slide1, wordmark, 'k-means k=10 (+slide 2), brightest saturated cluster outside the logo ramp'),
  text: src(F.slide1, text, 'k-means k=10 (slides 1-2), brightest cluster = body text'),
  muted: src(F.slide1, muted, 'k-means k=10 (slides 1-2), neutral mid-luminance cluster'),
  'block-blue': src(F.cover, blocks.blue, 'hue window 195-225, k-means k=3'),
  'block-orange': src(F.cover, blocks.orange, 'hue window 22-34, k-means k=3'),
  'block-red': src(F.cover, blocks.red, 'hue window 0-8, k-means k=3'),
  'block-green': src(F.cover, blocks.green, 'hue window 105-145, k-means k=3'),
  'block-gold': src(F.cover, blocks.gold, 'hue window 38-50, k-means k=3'),
};
const css = `/* GENERATED by scripts/build-tokens.mjs — do not hand-edit.
 * PALETTE RULE: every colour literal in the project lives in this file, nothing else.
 * Provenance: each value is a k-means centroid snapped to a REAL pixel of a file in brand/ or reference/.
 * Comments give: file, (x, y) pixel coordinate of that real pixel, and the sampling method.
 * Logo PNG with alpha: ${alpha.transparentBlack.toLocaleString('en-US')} fully transparent pixels are pure black -> premultiplied resize used${premul ? '' : ' (not needed)'}.
 */
:root {
${Object.entries(T).map(([n, s]) => row(n, s)).join('\n')}

  /* Derived (no new literals): mixes of the sampled values above. */
  --bg: var(--ground);
  --panel: color-mix(in srgb, var(--plate) 55%, var(--ground));
  --panel-2: color-mix(in srgb, var(--plate) 85%, var(--ground));
  --line: color-mix(in srgb, var(--accent-deep) 34%, var(--ground));
  --line-strong: color-mix(in srgb, var(--accent-mid) 55%, var(--ground));
  --text-dim: color-mix(in srgb, var(--text) 62%, var(--ground));
  --on-accent: var(--ground);
  --glow: color-mix(in srgb, var(--accent) 38%, transparent);
  --wash: color-mix(in srgb, var(--accent) 10%, transparent);
  --ok: var(--block-green);
  --warn: var(--block-orange);
  --bad: var(--block-red);
  color-scheme: dark;
}
`;
writeFileSync(P('src/tokens.css'), css);

const prov = { generatedBy: 'scripts/build-tokens.mjs', premultipliedResize: premul, logoAlpha: { transparentPureBlack: alpha.transparentBlack, fullyTransparent: alpha.transparentAny, partial: alpha.partial }, tokens: T };
writeFileSync(P('brand/palette.json'), JSON.stringify(prov, null, 2) + '\n');
writeFileSync(P('brand/PROVENANCE.md'), `# Palette provenance\n\nSampled from the real files in \`brand/\` and \`reference/\` by \`scripts/build-tokens.mjs\` (k-means, snapped to a real pixel coordinate).\nLiterals live only in \`src/tokens.css\`.\n\n| token | hex | file | pixel (x, y) | method |\n|---|---|---|---|---|\n${Object.entries(T).map(([n, s]) => `| ${n} | ${s.hex} | ${s.file} | ${s.x}, ${s.y} | ${s.how} |`).join('\n')}\n\nLogo PNG (RGBA): ${alpha.transparentBlack.toLocaleString('en-US')} of ${alpha.total.toLocaleString('en-US')} pixels are fully transparent *and* pure black, so every resize is premultiplied (no dark fringe).\n\nInferred (not stated in any asset): the body typeface is Montserrat (matches the slides' letterforms), self-hosted from \`public/fonts\`.\n`);
console.log(css.split('\n').slice(0, 24).join('\n'));
console.log(`favicon.svg rects: ${rects.length}; premultiplied: ${premul}`);
