// Image IO + analysis helpers. Dev-time only (pngjs / jpeg-js).
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';

const COLOR_TYPES = { 0: 'grayscale', 2: 'truecolor RGB', 3: 'indexed', 4: 'grayscale+alpha', 6: 'truecolor RGBA' };

// Reads the PNG IHDR (or JPEG SOF) straight from bytes, independent of the decoder.
export function header(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) {
    if (buf.toString('ascii', 12, 16) !== 'IHDR') throw new Error('no IHDR');
    const colorType = buf[25];
    const hasTRNS = buf.includes(Buffer.from('tRNS'));
    return { kind: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bitDepth: buf[24], colorType, colorName: COLOR_TYPES[colorType], interlace: buf[28], tRNS: hasTRNS };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
        return { kind: 'jpeg', precision: buf[i + 4], height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), components: buf[i + 9], progressive: m === 0xc2 };
      }
      i += 2 + len;
    }
  }
  throw new Error('unknown image format');
}

export function decode(path) {
  const buf = readFileSync(path);
  const h = header(buf);
  if (h.kind === 'png') {
    const p = PNG.sync.read(buf);
    return { ...h, data: p.data, width: p.width, height: p.height };
  }
  const j = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
  return { ...h, data: j.data, width: j.width, height: j.height };
}

export function alphaStats(img) {
  const hist = new Array(8).fill(0); // 8 alpha buckets of 32
  let transparentBlack = 0, transparentAny = 0, partial = 0;
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    hist[a >> 5]++;
    if (a === 0) { transparentAny++; if (d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 0) transparentBlack++; }
    else if (a < 255) partial++;
  }
  return { hist, transparentAny, transparentBlack, partial, total: d.length / 4 };
}

export const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
export const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Deterministic k-means++ over opaque pixels (stride-sampled). Each centroid is snapped to
// the nearest REAL pixel of the image and its coordinate recorded.
export function kmeans(img, k = 8, { maxSamples = 60000, seed = 7, minAlpha = 250 } = {}) {
  const { data, width } = img;
  const n = data.length / 4;
  const stride = Math.max(1, Math.floor(n / maxSamples));
  const idx = [];
  for (let p = 0; p < n; p += stride) if (data[p * 4 + 3] >= minAlpha) idx.push(p);
  const pts = idx.map((p) => [data[p * 4], data[p * 4 + 1], data[p * 4 + 2]]);
  if (pts.length < k) throw new Error('too few opaque pixels');
  const rnd = mulberry(seed);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let cents = [pts[Math.floor(rnd() * pts.length)]];
  while (cents.length < k) {
    const ds = pts.map((p) => Math.min(...cents.map((c) => d2(p, c))));
    const tot = ds.reduce((a, b) => a + b, 0);
    let r = rnd() * tot, j = 0;
    while (j < ds.length - 1 && (r -= ds[j]) > 0) j++;
    cents.push(pts[j]);
  }
  let assign = new Array(pts.length).fill(0);
  for (let it = 0; it < 30; it++) {
    let moved = 0;
    for (let i = 0; i < pts.length; i++) {
      let best = 0, bd = Infinity;
      for (let c = 0; c < k; c++) { const d = d2(pts[i], cents[c]); if (d < bd) { bd = d; best = c; } }
      if (assign[i] !== best) { assign[i] = best; moved++; }
    }
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    pts.forEach((p, i) => { const s = sums[assign[i]]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
    cents = sums.map((s, c) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cents[c]));
    if (!moved) break;
  }
  const counts = new Array(k).fill(0);
  assign.forEach((a) => counts[a]++);
  // Snap: nearest real pixel (over the sampled set) per centroid.
  return cents
    .map((c, ci) => {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < pts.length; i++) { const d = d2(pts[i], c); if (d < bd) { bd = d; bi = i; } }
      const p = idx[bi];
      const rgb = pts[bi];
      return { rgb, hex: toHex(rgb), x: p % width, y: Math.floor(p / width), share: counts[ci] / pts.length };
    })
    .sort((a, b) => b.share - a.share);
}

// Premultiplied box-filter resize (avoids dark fringes where transparent pixels are black).
export function resizePremul(img, w, h) {
  const { data, width, height } = img;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y * height) / h), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / h));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x * width) / w), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / w));
      let r = 0, g = 0, b = 0, a = 0, cnt = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const i = (yy * width + xx) * 4, al = data[i + 3] / 255;
        r += data[i] * al; g += data[i + 1] * al; b += data[i + 2] * al; a += al; cnt++;
      }
      const o = (y * w + x) * 4;
      if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
      out[o + 3] = (a / cnt) * 255;
    }
  }
  return { width: w, height: h, data: out };
}

// Bounding box of pixels with alpha above threshold.
export function bbox(img, thr = 8) {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (img.data[(y * img.width + x) * 4 + 3] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function crop(img, b) {
  const out = new Uint8ClampedArray(b.w * b.h * 4);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const s = ((b.y0 + y) * img.width + b.x0 + x) * 4, o = (y * b.w + x) * 4;
    out[o] = img.data[s]; out[o + 1] = img.data[s + 1]; out[o + 2] = img.data[s + 2]; out[o + 3] = img.data[s + 3];
  }
  return { width: b.w, height: b.h, data: out };
}

export function encodePng(img) {
  const p = new PNG({ width: img.width, height: img.height });
  Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length).copy(p.data);
  return PNG.sync.write(p);
}
