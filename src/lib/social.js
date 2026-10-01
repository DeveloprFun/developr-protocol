import { esc } from './format.js';
import { linkFor, handleFromUrl, REGISTER } from '../register.js';

const ICONS = {
  x: '<path d="M18.9 3H22l-7.2 8.2L23 21h-6.6l-5.2-6.6L5.3 21H2.2l7.7-8.8L1.6 3h6.8l4.7 6.1L18.9 3Zm-1.2 16.1h1.8L7.4 4.8H5.5l12.2 14.3Z"/>',
  github:
    '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>',
};
const LABEL = { x: 'X', github: 'GitHub' };

// Icon-only. A link exists only for a `stated` register record; otherwise an inert span.
export function renderSocial(kind, reg = REGISTER) {
  const icon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false">${ICONS[kind]}</svg>`;
  const url = linkFor(kind, reg);
  if (url) {
    const handle = handleFromUrl(url);
    return `<a class="icon-btn" data-social="${kind}" href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="${LABEL[kind]}${handle ? ' ' + esc(handle) : ''}">${icon}</a>`;
  }
  return `<span class="icon-btn is-inert" data-social="${kind}" role="img" aria-disabled="true" aria-label="${LABEL[kind]}: not available yet">${icon}</span>`;
}
