# Security Policy

## Scope

This repository contains a static front end that only reads public data. There are no keys, accounts or servers in it. Planned contract tooling is not yet deployed, so there are currently no deployed Developr contracts to attack.

In scope:

- Cross-site scripting or injection through any input (for example the lookup bar)
- Links or copy targets that could send a user to an unintended destination
- Anything that makes the contract-address slot or social icons show or link an unverified value
- Supply-chain issues in build dependencies

Out of scope:

- Outages or inaccuracies in third-party feeds (DefiLlama, the chain RPC, DexScreener)
- Social engineering of users
- Findings that require a compromised browser or device

## Reporting

Do **not** open a public issue for a vulnerability.

Use the repository's private vulnerability reporting (the *Security* tab, then *Report a vulnerability*) once the repository is public. No email address or other contact has been announced; if one appears anywhere not listed in the README as stated, do not trust it.

Please include:

1. A description and the impact
2. Steps to reproduce, or a proof of concept
3. Affected page and browser

## What to expect

- Acknowledgement of a report as soon as it is seen
- A fix or a clear explanation of why no fix is needed
- Credit in the release notes if you want it

There is no bounty program.

## Impersonation warning

No official contract address, account or contact has been announced. Any message, site or address claiming to represent Developr should be treated as unverified. Confirm addresses in full, on the correct network (chain ID 4663), against this repository before sending anything.
