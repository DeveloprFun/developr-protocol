# Contributing to Developr

Thanks for looking. This project values small, verifiable changes.

## Ground rules

1. **Claims match reality.** Do not describe planned work as shipped.
2. **One record per external fact.** Addresses, links and dates live in the register with a state (`stated`, `absent`, `unconfirmed`). Do not hard-code them elsewhere, and never fill an absent value with a guess.
3. **Links come from URLs.** Store the URL; derive any handle from it.
4. **Colours live in the tokens file only.** Do not add colour literals to stylesheets, scripts or markup.
5. **Do not reject valid 0x hex.** Token contracts are 40 hex digits, pool identifiers are 64. Validation must accept both.
6. **Write original copy.** Do not paste text from other sites.

## Workflow

1. Open an issue describing the change, or pick an existing one.
2. Fork and branch from the default branch.
3. Keep the change focused.
4. Run the build and the checks locally:

   ```bash
   npm install
   npm run build
   npm run gates
   ```

5. Open a pull request explaining what changed and why. Include before and after screenshots for visual changes.

## Pull request checklist

- [ ] Build passes
- [ ] Checks pass
- [ ] No horizontal overflow at 360, 390, 430, 1366 and 1440 pixels wide
- [ ] Interactive elements are at least 48 pixels tall and wide
- [ ] No new colour literals outside the tokens file
- [ ] Copy is original and does not overstate what exists
- [ ] Docs updated if behavior changed

## Commit style

Short imperative subject line, for example `Handle empty pair list in market table`. Explain the reason in the body when it is not obvious.

## Reporting bugs

Include the page, the viewport width, what you expected and what happened. For anything security related, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Conduct

Be kind and be specific. Critique the change, not the person.
