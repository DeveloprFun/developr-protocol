import { REGISTER } from './register.js';

export const CHAIN = {
  id: REGISTER.chainId.value,
  name: 'Robinhood Chain',
  rpc: REGISTER.rpc.value,
  llamaName: 'Robinhood Chain',
  dexChainId: 'robinhood',
};

export const DEX_URL = (id) => `https://dexscreener.com/${CHAIN.dexChainId}/${id}`;

export const REFRESH_MS = 6000;       // head + gas
export const SLOW_REFRESH_MS = 60000; // tvl + pairs (same cadence as the reference stats)
