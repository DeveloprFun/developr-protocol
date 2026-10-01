const ADDR = /^0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;

export const isAddress = (s) => typeof s === 'string' && ADDR.test(s.trim());
export const isTxHash = (s) => typeof s === 'string' && HASH.test(s.trim());

export function hexToBigInt(hex) {
  if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]+$/.test(hex)) throw new Error('bad hex');
  return BigInt(hex);
}

export function usd(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [v, s] of units) if (abs >= v) return `$${(n / v).toFixed(2)}${s}`;
  return `$${n.toFixed(abs < 1 ? 4 : 2)}`;
}

export function pct(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function int(n) {
  if (typeof n === 'bigint') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

// wei (bigint) -> gwei string with adaptive precision (L2 gas is sub-gwei).
export function gwei(wei) {
  const v = Number(wei) / 1e9;
  if (!Number.isFinite(v)) return '—';
  if (v >= 10) return v.toFixed(1);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

export function shortAddr(a) {
  return isAddress(a) ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

// Ease-out cubic for t in [0,1].
export const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
