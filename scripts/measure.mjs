// Layout measurement at the five target breakpoints: no horizontal overflow, 48px tap targets.
// Uses the system Edge/Chrome through puppeteer-core. Exit 0 pass, 1 fail, 2 no browser found.
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { start } from './lib/server.mjs';

export const BREAKPOINTS = [[360, 780], [390, 844], [430, 932], [1366, 768], [1440, 900]];
const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function probe() {
  const vw = innerWidth, de = document.documentElement;
  const small = [];
  document.querySelectorAll('a[href],button,input,summary,[role=tab]').forEach((el) => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none' || el.classList.contains('skip')) return;
    if (r.width < 47.5 || r.height < 47.5) small.push(`${el.tagName.toLowerCase()}.${el.className || el.id} ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  const wide = [];
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('.marquee,.table-wrap,.field') || el.classList.contains('skip')) return;
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > vw + 0.5 || r.left < -0.5)) wide.push(`${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className} r=${Math.round(r.right)} l=${Math.round(r.left)}`);
  });
  const ca = document.querySelector('#ca-slot');
  const caText = ca?.textContent.trim() ?? '';
  return { vw, scrollW: de.scrollWidth, overflowX: de.scrollWidth > vw, small, wide: wide.slice(0, 6), caH: Math.round(ca?.getBoundingClientRect().height ?? 0), caVisible: ca ? ca.getBoundingClientRect().top >= 0 && ca.getBoundingClientRect().bottom <= innerHeight : false, caText };
}

export async function measure({ shots } = {}) {
  const exe = CANDIDATES.find((p) => existsSync(p));
  if (!exe) return { skipped: true, results: [] };
  const { server, port } = await start(0);
  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    for (const [w, h] of BREAKPOINTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      await new Promise((r) => setTimeout(r, 2500));
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
      const r = await page.evaluate(probe);
      // scrolled: CA bar must stay pinned in view
      await page.evaluate(() => scrollTo(0, 1500));
      r.caPinned = await page.evaluate(() => { const b = document.querySelector('#ca-slot').getBoundingClientRect(); return b.top >= 0 && b.top < 2 && b.bottom <= innerHeight; });
      if (shots) await page.screenshot({ path: `${shots}/shot-${w}.png`, fullPage: true });
      results.push({ w, h, ...r });
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
  return { skipped: false, results };
}

if (process.argv[1]?.endsWith('measure.mjs')) {
  const out = await measure({ shots: process.argv[2] });
  if (out.skipped) { console.log('no browser found'); process.exit(2); }
  let bad = 0;
  for (const r of out.results) {
    const ok = !r.overflowX && !r.wide.length && !r.small.length && r.caPinned;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.w}x${r.h}  scrollW=${r.scrollW} overflowX=${r.overflowX} caH=${r.caH} caPinned=${r.caPinned} small=${JSON.stringify(r.small)} wide=${JSON.stringify(r.wide)}`);
  }
  process.exit(bad ? 1 : 0);
}
