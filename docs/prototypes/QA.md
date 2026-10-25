# Interface study verification

Verified on 2026-10-24 using T3 HTML Preview and the collaborative browser.

## Interaction checks

25 browser interaction checks passed:

- Next advances; first/last events disable the corresponding navigation button.
- The illustrative ARP cache gains its mapping on reply delivery; Previous restores the earlier empty state.
- Switching layouts preserves the current event.
- Tutorial on/off changes guidance, including synchronisation between the main control and device setup preview.
- Protocol and link detail dialogs open.
- Essential setup previews open for Host, Router, Switch, Bridge and Hub; the Host tutorial advances to the next field.
- The missing-gateway example can be started, explains the failure, and clears that future failure when stepping back.
- The local-subnet example hides the unused router and reaches the reply milestone.
- A study can be saved with a name, found in My networks and reopened with its saved scenario. The temporary QA study was removed after checking it.

These are prototype UI checks. They do not verify a real network engine, arbitrary network construction, real snapshot restoration, or the future React Flow integration.

## Visual checks

Both layouts previewed at 320, 375, 414 and 768 CSS pixels, and desktop previews at 1280 pixels. Checked document overflow, offscreen controls and wrapped chapter controls. Relevant controls remain within the viewport. Reduced motion is supported; link information is available by focus and selection as well as hover.

Representative computed WCAG text contrast ratios after corrections:

| Pair | A | B |
| --- | ---: | ---: |
| Body / paper | 10.33 | 10.30 |
| Muted text / paper | 6.49 | 7.07 |
| Guidance / tinted surface | 9.07 | 9.48 |
| Primary text / accent | 6.60 | 9.78 |
| Error text / error surface | 7.73 | 7.73 |

Hallmark review applied to relevant app criteria: distinct structures, purposeful diagram, token use, English educational copy, no invented product metrics, no fake browser chrome, visible focus, restrained motion, readable interactive labels and mobile fallback. Marketing hero/CTA rules were not treated as app requirements. This is not a formal WCAG conformance audit.
