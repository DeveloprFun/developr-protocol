# Architecture

Two layers: what exists now (the site) and what is planned (the rack tooling). They are kept separate on purpose.

## 1. The site (exists)

A static front end built with Vite. It has no server of its own.

```
browser
  ├── DefiLlama      → value locked + history
  ├── Chain RPC      → block number, gas price (one batched JSON-RPC call)
  └── DexScreener    → pairs, liquidity, 24h volume, 24h price move
```

### Modules

| Area | Responsibility |
|---|---|
| Register | One record per external fact with a state (`stated`, `absent`, `unconfirmed`). Only `stated` records can produce a link or a copyable value. |
| Data | Fetchers with a timeout; parsers that throw on malformed payloads; every fetcher returns `{ ok: true, ... }` or `{ ok: false, error }`. |
| Lookup | Classifies input by length: 40 hex digits is a token contract, 64 is a pool identifier, other lengths get a specific hint. |
| UI | Count-up numbers, sparkline, skeleton rows, tabbed market table. |
| Field | Canvas of circuit traces with travelling pulses. Paused when hidden, off-screen or when reduced motion is requested. |
| Tokens | The only place colour values live, each traced to a real pixel of a brand asset. |

### Failure behavior

If a feed fails, its card reads *Unavailable*. The page never substitutes an estimate, and a failing feed does not block the others.

### Refresh

Chain head and gas refresh every 6 seconds; value locked and pairs every 60 seconds; everything refreshes when a hidden tab returns to view.

## 2. The rack (planned)

```
slot definitions  →  designer (preview)  →  deploy  →  pool
                                   ↑                       │
                                   └──── monitoring ───────┘
```

### 2.1 Slots

Five starting slots are sketched from the artwork. Their behavior is **unconfirmed**:

| Slot | Possible intent |
|---|---|
| Guard | Soften the opening stretch of trading |
| Scale | Let the fee follow trade size |
| Ember | Retire a share of supply on buys |
| Stream | Pass fee income to liquidity suppliers |
| Crown | Reward a buyer by a publicly checkable count |

### 2.2 Composition rules (draft)

- A slot does one thing.
- Slots must declare which pool events they use; two slots may not claim the same exclusive effect.
- Each slot adds to per-swap cost; the designer must show the total.
- Parameters are fixed when the pool is created.

### 2.3 Preview

The designer should output, for a chosen rack:

1. A plain-language rule list.
2. Worst-case effect on a trader for a few trade sizes.
3. The total added cost per swap.

Previews must be checked against real execution in tests before being trusted.

## 3. Security posture

- No private keys in the front end; the site only reads.
- No third-party scripts or fonts; requests go only to the three feeds above and DexScreener links.
- Reference slot code is reviewed independently before anything is offered for deployment. See [SECURITY](../.github/SECURITY.md).

## 4. Quality gates

A single command runs checks covering layout at five widths, tap-target size, palette provenance, copy originality, register rules, lookup behavior and parser correctness, all against synthetic fixtures with no network.
