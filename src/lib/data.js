import { CHAIN } from '../config.js';
import { hexToBigInt } from './format.js';

const TIMEOUT_MS = 8000;

async function getJson(fetchImpl, url, init = {}, timeout = TIMEOUT_MS) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeout) : null;
  try {
    const res = await fetchImpl(url, { ...init, signal: ctl?.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const fail = (e) => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

// ---- DefiLlama: chain TVL -------------------------------------------------
export function parseLlamaTvl(rows) {
  if (!Array.isArray(rows)) throw new Error('bad llama payload');
  const series = rows
    .filter((r) => r && Number.isFinite(r.date) && Number.isFinite(r.tvl))
    .map((r) => ({ t: r.date, v: r.tvl }));
  if (!series.length) throw new Error('empty llama series');
  return { tvl: series[series.length - 1].v, series };
}

export async function fetchTvl(fetchImpl = fetch) {
  try {
    const url = `https://api.llama.fi/v2/historicalChainTvl/${encodeURIComponent(CHAIN.llamaName)}`;
    return { ok: true, ...parseLlamaTvl(await getJson(fetchImpl, url)) };
  } catch (e) {
    return fail(e);
  }
}

// ---- RPC: block + gas -----------------------------------------------------
export function parseHead(batch) {
  if (!Array.isArray(batch)) throw new Error('bad rpc payload');
  const by = Object.fromEntries(batch.map((r) => [r.id, r]));
  if (!by[1] || !by[2] || by[1].error || by[2].error) throw new Error('rpc error');
  return { block: hexToBigInt(by[1].result), gasWei: hexToBigInt(by[2].result) };
}

export async function fetchHead(fetchImpl = fetch) {
  try {
    const body = JSON.stringify([
      { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] },
      { jsonrpc: '2.0', id: 2, method: 'eth_gasPrice', params: [] },
    ]);
    const json = await getJson(fetchImpl, CHAIN.rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    return { ok: true, ...parseHead(json) };
  } catch (e) {
    return fail(e);
  }
}

// ---- DexScreener: pairs ---------------------------------------------------
export function parsePairs(payload, limit = 8) {
  const list = payload?.pairs;
  if (!Array.isArray(list)) throw new Error('bad dexscreener payload');
  const pairs = list
    .filter((p) => p && p.chainId === CHAIN.dexChainId && p.baseToken && p.quoteToken)
    .map((p) => ({
      id: p.pairAddress,
      url: p.url,
      dex: p.dexId,
      version: Array.isArray(p.labels) ? p.labels[0] ?? '' : '',
      base: p.baseToken.symbol,
      baseAddress: p.baseToken.address,
      quote: p.quoteToken.symbol,
      priceUsd: Number(p.priceUsd),
      liquidity: Number(p.liquidity?.usd) || 0,
      volume24h: Number(p.volume?.h24) || 0,
      change24h: Number.isFinite(Number(p.priceChange?.h24)) ? Number(p.priceChange.h24) : null,
    }))
    .sort((a, b) => b.liquidity - a.liquidity);
  const totalVolume24h = pairs.reduce((s, p) => s + p.volume24h, 0);
  return { pairs, total: pairs.length, totalVolume24h, limit };
}

export async function fetchPairs(fetchImpl = fetch) {
  try {
    const url = `https://api.dexscreener.com/latest/dex/search?q=${CHAIN.dexChainId}`;
    return { ok: true, ...parsePairs(await getJson(fetchImpl, url)) };
  } catch (e) {
    return fail(e);
  }
}

// Group pairs by base token (Tokens tab).
export function groupTokens(pairs) {
  const map = new Map();
  for (const p of pairs) {
    const key = p.baseAddress || p.base;
    const cur = map.get(key);
    if (!cur) map.set(key, { ...p, pools: 1 });
    else {
      cur.liquidity += p.liquidity;
      cur.volume24h += p.volume24h;
      cur.pools += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.liquidity - a.liquidity);
}
