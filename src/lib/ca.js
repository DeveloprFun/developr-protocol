import { isAddress, esc } from './format.js';

// CA slot markup. Absent CA => inert, no date, no copy target.
export function renderCa(ca) {
  if (!ca) {
    return `<div class="ca" id="ca-slot" data-state="absent" aria-disabled="true">
  <span class="ca-label">CA</span>
  <span class="ca-value ca-empty">No contract announced</span>
</div>`;
  }
  if (!isAddress(ca)) throw new Error('CA is not a valid address');
  return `<div class="ca" id="ca-slot" data-state="set">
  <span class="ca-label">CA</span>
  <button type="button" class="ca-value ca-copy" data-copy="${esc(ca)}" aria-label="Copy contract string ${esc(ca)}">${esc(ca)}</button>
  <span class="ca-action" data-copy-state="idle" role="status" aria-live="polite">Click to copy</span>
</div>`;
}

export async function copyText(text, clipboard) {
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
