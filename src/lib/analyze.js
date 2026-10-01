// Input classification for the lookup bar.
// GATE WARNING: never blanket-reject 0x hex. A 40-hex string is a token address, a 64-hex string
// is a pool id (or tx hash); both are valid inputs. Only lengths we cannot place get a specific hint.
const HEX = /^[0-9a-fA-F]*$/;

export function classify(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return { kind: 'empty', message: 'Nothing pasted yet.' };
  const has0x = /^0x/i.test(v);
  const body = has0x ? v.slice(2) : v;
  if (!HEX.test(body)) return { kind: 'invalid', message: 'After 0x only hex digits fit.' };
  if (!has0x) return { kind: 'invalid', message: 'Start with 0x, then hex digits: 40 (tokens) or 64 (pools).' };
  if (body.length === 40) return { kind: 'address', id: v, message: 'Token contract.' };
  if (body.length === 64) return { kind: 'poolId', id: v, message: 'Pool identifier.' };
  if (body.length < 40) return { kind: 'partial', message: `Only ${body.length} digits after 0x. Tokens need 40, pools need 64.` };
  if (body.length < 64) return { kind: 'partial', message: `${body.length} digits after 0x. Tokens need 40; pools need ${64 - body.length} more.` };
  return { kind: 'invalid', message: `${body.length} digits after 0x is too many. Tokens need 40, pools need 64.` };
}

export const PLACEHOLDER_WORDS = ['token contract', 'pool identifier'];

// Rotating placeholder: 2600 ms cadence, 240 ms swap (timings measured from the reference bundle).
export const PLACEHOLDER_CADENCE = { every: 2600, swap: 240 };
export function nextWord(words, i) {
  return (i + 1) % words.length;
}
