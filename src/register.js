// REGISTER PATTERN: every external fact is exactly one record with a state.
//   stated      - a source says so; `value` is set and may be rendered / linked
//   absent      - nothing exists yet; `value` is null; render an inert slot, never a link
//   unconfirmed - we infer it (or it is unverified); render with a visible caveat, never as a link
// LINK RULE: store the URL, derive the handle from it. Never store a handle on its own.

const rec = (label, state, value, extra = {}) => ({ label, state, value, ...extra });

export const REGISTER = {
  ca: rec('Contract address', 'absent', null, { kind: 'address' }),
  x: rec('X', 'absent', null, { kind: 'url' }),
  github: rec('GitHub', 'absent', null, { kind: 'url' }),
  domain: rec('Domain', 'stated', 'developr.fun', { source: 'reference/DEVELOPR 1.jpg.jpeg' }),
  chainId: rec('Chain ID', 'stated', 4663, { source: 'project brief' }),
  rpc: rec('RPC', 'stated', 'https://rpc.mainnet.chain.robinhood.com', { kind: 'url', source: 'project brief' }),
  uniswap: rec('Uniswap integration', 'stated', 'Uniswap', { source: 'reference slides' }),
  rackSlots: rec('Rack slot meanings', 'unconfirmed', null, { source: 'inferred from brand/cover artwork icons' }),
  launch: rec('Launch date', 'absent', null),
};

const ADDR = /^0x[0-9a-fA-F]{40}$/;

export function isHttpsUrl(v) {
  try { return new URL(v).protocol === 'https:'; } catch { return false; }
}

// Throws if any record breaks its state contract.
export function assertRegister(reg = REGISTER) {
  for (const [key, r] of Object.entries(reg)) {
    if (!['stated', 'absent', 'unconfirmed'].includes(r.state)) throw new Error(`${key}: bad state ${r.state}`);
    if (r.state === 'stated' && (r.value === null || r.value === undefined || r.value === '')) throw new Error(`${key}: stated without value`);
    if (r.state === 'absent' && r.value !== null) throw new Error(`${key}: absent but has value`);
    if (r.state === 'stated' && r.kind === 'url' && !isHttpsUrl(r.value)) throw new Error(`${key}: stated url is not https`);
    if (r.state === 'stated' && r.kind === 'address' && !ADDR.test(r.value)) throw new Error(`${key}: stated address is not a 42-char 0x address`);
  }
  return true;
}

// Only a stated url record yields an href. Everything else yields null.
export function linkFor(key, reg = REGISTER) {
  const r = reg[key];
  return r && r.state === 'stated' && r.kind === 'url' && isHttpsUrl(r.value) ? r.value : null;
}

// Handle is derived from the stored URL, never stored itself.
export function handleFromUrl(url) {
  if (!isHttpsUrl(url)) return null;
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[0] ? (new URL(url).hostname.replace(/^www\./, '') === 'x.com' || new URL(url).hostname === 'twitter.com' ? `@${parts[0]}` : parts[0]) : null;
}

// CA is shown (full, copyable) only when stated.
export const caValue = (reg = REGISTER) => (reg.ca.state === 'stated' ? reg.ca.value : null);
