# Developr Whitepaper

*Status: draft vision. Nothing described as a feature here is deployed unless the roadmap says so.*

## 1. Summary

Automated market makers treat every pool the same: a formula, a fee, a swap. Hooks change that. A hook is code attached to a pool that runs at defined moments around a swap or a liquidity change. With hooks, a pool can have habits: calmer openings, fees that react to trade size, rewards for the people who supply liquidity.

The trouble is legibility. A hook is only useful to traders if they can tell, before risking money, what it does. Developr is an attempt to make pool behavior **pickable, previewable and readable**.

## 2. Problem

1. **Writing hooks is hard.** Every team reimplements the same handful of behaviors, and each copy is a fresh place for bugs.
2. **Reading hooks is harder.** A trader staring at a pool address cannot tell whether it taxes buys, burns supply or hides a switch.
3. **Discovery is poor.** There is no shared place to see which pools carry which rules on a given network.

## 3. Approach

### 3.1 The cube and the rack

Our artwork frames the model:

- A **cube** is a single unit of pool behavior.
- A **rack** holds a small number of slots. Each slot accepts one cube.
- A finished **pool** is the rack's output: a market whose rules are the sum of its slots.

Five starting slots are sketched (Guard, Scale, Ember, Stream, Crown). Their meanings are inferred from the artwork and are **unconfirmed**; see [architecture](architecture.md) for what each might do.

### 3.2 Preview before signing

Before any signature, a designer should show the complete rule set in plain language, including worst-case effects on a trader. If a rack cannot be described plainly, it should not ship.

### 3.3 Read before trading

Any pool identifier or token contract should resolve to a readable description of its rules. The lookup bar on the site is the first, small step: it routes an identifier to its live market page.

## 4. Why Robinhood Chain

Robinhood Chain (chain ID 4663) is young, so conventions are still forming. A shared way to build and read pool behavior is most valuable early, before each team invents its own.

## 5. Principles

- **Legible over clever.** A simple rule a trader can read beats an elaborate one they cannot.
- **Sources over guesses.** Numbers come from named feeds. When a feed fails, the interface says so.
- **Claims match reality.** Planned means planned.
- **Identity is a contract string.** Never a ticker, never a handle.

## 6. Risks

- Hook logic is code; code has bugs. Independent review is required before anything is offered for deployment.
- Preview tooling can be wrong. It must be tested against real execution, not just trusted.
- Third-party feeds can be late or partial. The dashboard is informational only.

## 7. Status

The live dashboard exists. Everything else is tracked on the [roadmap](roadmap.md).
