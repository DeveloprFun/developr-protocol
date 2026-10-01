<p align="center">
  <img src="public/logo.png" alt="Developr mark" width="120" />
</p>

<h1 align="center">Developr</h1>

<p align="center">
  A workshop for how Uniswap pools behave, built around Robinhood Chain.<br />
  Live chain numbers today. Hook tooling next.
</p>

<p align="center">
  <a href="https://developr.fun">developr.fun</a> &nbsp;·&nbsp; MIT licensed &nbsp;·&nbsp; Chain ID 4663
</p>

---

## What this is

Developr is a developer-facing site and toolkit for programmable pool behavior. The idea: a pool should be able to carry its own rules, and anyone should be able to read those rules before trading.

The working piece today is the dashboard. It reads the chain directly and shows:

- **Value locked** across Robinhood Chain (DefiLlama)
- **Chain head and gas price** (public RPC, refreshed every few seconds)
- **24h traded volume and the deepest pairs** (DexScreener)
- A **lookup bar** that takes a token contract (40 hex digits) or a pool identifier (64 hex digits) and opens its market page

The hook tooling (the rack, designer and deploy step) is **planned, not shipped**. See the [roadmap](docs/roadmap.md) and be skeptical of anything that claims otherwise.

## Network

| Field | Value |
|---|---|
| Chain | Robinhood Chain |
| Chain ID | `4663` |
| Gas currency | ETH |
| RPC | `https://rpc.mainnet.chain.robinhood.com` |

## Project facts

Every external fact is tracked as a single record with a state: `stated`, `absent` or `unconfirmed`. Nothing below is filled in until a real source exists.

| Fact | State | Value |
|---|---|---|
| Domain | stated | developr.fun |
| Contract address | **absent** | Not announced. The slot at the top of the site stays inert until one is. |
| X | **absent** | Not announced |
| GitHub | **absent** | Not announced |
| Launch date | **absent** | Not announced |
| Rack slot meanings | unconfirmed | Read from artwork icons; not final |

If you see another account or address claiming to be Developr, treat it as unverified. An identity is a full contract string on the correct network, never a ticker or a handle.

## Documentation

| Document | Covers |
|---|---|
| [Whitepaper](docs/whitepaper.md) | Vision and protocol overview |
| [Architecture](docs/architecture.md) | How the site and the planned tooling fit together |
| [Tokenomics](docs/tokenomics.md) | Current status of any token (there is none announced) |
| [Roadmap](docs/roadmap.md) | Phases and what is actually done |
| [Contributing](.github/CONTRIBUTING.md) | How to help |
| [Security](.github/SECURITY.md) | How to report a problem |

## Run it locally

```bash
npm install
npm run dev
```

Production build and checks:

```bash
npm run build
npm run gates
```

## Design notes

- The palette is sampled from the supplied brand files; provenance is in [brand/PROVENANCE.md](brand/PROVENANCE.md).
- Colour literals live in a single tokens file.
- Any figure that cannot be read shows *Unavailable*. Gaps are never filled with estimates.

## License

MIT. See [LICENSE](LICENSE).

---

<sub>Information only. Nothing in this repository is financial advice.</sub>
