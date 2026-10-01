// Reads every file in brand/ and reference/. Reports IHDR/SOF, alpha histogram, dominant pixels,
// k-means palette snapped to real pixel coordinates. Writes brand/palette.json (provenance source).
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, alphaStats, kmeans, toHex } from './lib/image.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const report = {};
for (const dir of ['brand', 'reference']) {
  for (const f of readdirSync(join(root, dir))) {
    if (!/\.(png|jpe?g)$/i.test(f)) continue;
    const img = decode(join(root, dir, f));
    const a = alphaStats(img);
    const k = kmeans(img, 8);
    const { data, ...hdr } = img;
    report[`${dir}/${f}`] = {
      header: hdr,
      alpha: { histogram8: a.hist, fullyTransparent: a.transparentAny, transparentPureBlack: a.transparentBlack, partial: a.partial, total: a.total },
      kmeans: k.map((c) => ({ hex: c.hex, x: c.x, y: c.y, share: +c.share.toFixed(4) })),
    };
    console.log(`\n${dir}/${f}`);
    console.log('  header :', JSON.stringify(hdr));
    console.log('  alpha  :', JSON.stringify(report[`${dir}/${f}`].alpha));
    console.log('  kmeans :', k.map((c) => `${c.hex}@(${c.x},${c.y}) ${(c.share * 100).toFixed(1)}%`).join('  '));
  }
}
writeFileSync(join(root, 'brand', 'palette.json'), JSON.stringify(report, null, 2) + '\n');
console.log('\nwrote brand/palette.json');
