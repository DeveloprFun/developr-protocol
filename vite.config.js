import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { REGISTER, caValue } from './src/register.js';
import { renderCa } from './src/lib/ca.js';
import { renderSocial } from './src/lib/social.js';

// Bakes the CA slot + social icons into static HTML so they exist before JS runs.
// Both read the register: only `stated` records ever become a value or a link.
// theme-color must be a literal in HTML: read it from tokens.css so that file stays the only source.
const groundHex = () => readFileSync(new URL('./src/tokens.css', import.meta.url), 'utf8').match(/--ground:\s*(#[0-9a-fA-F]{6})/)[1];

const bake = () => ({
  name: 'developr-bake',
  transformIndexHtml: (html) =>
    html
      .replace('<!--THEME-->', groundHex())
      .replace('<!--CA-->', renderCa(caValue(REGISTER)))
      .replace('<!--SOCIALS-->', renderSocial('x', REGISTER) + renderSocial('github', REGISTER)),
});

export default defineConfig({
  base: './',
  plugins: [bake()],
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022', cssMinify: true },
});
