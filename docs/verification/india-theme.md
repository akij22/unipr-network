# India dark theme — token adaptation and verification

Date: 2026-11-08 · Branch: `feat/india-theme` · Scope: tokens, fonts, scene colors only. No layout, behavior, or simulation changes.

## Source

- Theme: tweakcn preset **India** dark, `https://tweakcn.com/themes/cmkr1zzlc000j04lb9iz9g43m` (user-approved).
- Token values are from the theme's embedded data: background `#0a0a0a`, foreground `#ebebeb`, card `#050505`, popover `#1a1a1a`, primary `#ff9933`, on-primary `#2e1700`, secondary/muted `#262626`, muted-foreground `#999999`, accent `#fa7d00` over wash `#331f0a`, border `#212121`, input `#383838`, sidebar `#121212`, radius `0`, sans **Plus Jakarta Sans**.

## Adaptations (deliberate departures from the raw preset)

1. **Surface hierarchy.** The preset's card (`#050505`) is nearly indistinguishable from background (`#0a0a0a`). Surfaces were spread to keep the existing page → canvas → panel → raised relationships recognizable:
   - `--color-paper` `#0a0a0a` (preset background)
   - `--color-field` `#101010` (preset card `#050505`, lifted so the canvas ground reads against the page)
   - `--color-panel` `#1a1a1a` (preset popover)
   - `--color-raised` `#262626` (preset secondary/muted)
   - `--color-glass` = `rgba(20, 20, 20, 0.94)` (floating dock/menu)
2. **Text steps:** ink `#ebebeb` (preset foreground), a body step `#cccccc` between foreground and muted-foreground `#999999`.
3. **Accent naming.** `--color-blue` / `--color-blue-bg` were renamed to `--color-accent` (`#fa7d00`) / `--color-accent-bg` (`#331f0a`) and all consumers updated (layout, workspace, flow, simulation stylesheets). `--color-network-a(-line)` deliberately stays blue as network-segment/protocol identity, not UI accent.
4. **Radius.** Preset radius `0` adapted to compact near-square steps usable by interactive targets: `--radius-tight: 3px`, `--radius-control: 4px`, `--radius-panel: 6px`. All raw border-radius literals in `layout.css`, `simulation.css`, `saves.css`, `flow.css` now reference these tokens (the toggle track and circular dots keep their shapes).
5. **Typography.** Interface text: Plus Jakarta Sans (preset sans); addresses/packet data: JetBrains Mono replacing the previous Geist Mono stack (instead of the preset's Anonymous Pro). `index.html` loads `Plus+Jakarta+Sans:wght@400..700` and `JetBrains+Mono:wght@400;500;600` and updates `theme-color` to `#0a0a0a`.
6. **Semantic colors preserved.** Warning amber, success green, error red, packet amber marker, and the semantic on-primary (`#2e1700` — dark text on saffron keeps hover legible) are unchanged in meaning.

## Files changed

- `src/styles/tokens.css` — full preset mapping, accent tokens, radii, fonts
- `src/styles/layout.css`, `workspace.css`, `simulation.css`, `flow.css`, `saves.css` — accent token rename, radius tokens in place of literals, header comment updates
- `src/styles/scene-tokens.ts` — scene accent/selection to saffron (`#fa7d00` / `#ffa94d`), device screens `#ffc587`, grid/light neutralized from blue-tinted
- `index.html` — font loading and `theme-color`

## Verification run locally (Node 26.11.1 / Bun 1.3.8)

- `bun run typecheck` — pass
- `bun run test` — 17 files, 84 tests, all pass
- `bun run build` — pass (CSS bundle 43.82 kB)

## Browser verification

- Chromium visual checks at 320, 375, 414, 768 and 1440 CSS pixels: no horizontal page overflow; Plus Jakarta Sans and JetBrains Mono load; accent resolves to `#fa7d00`, primary to `#ff9933` with dark text. Screenshots are local QA artifacts in `.hallmark/india-<width>.png`.
- Ran `bun run test:e2e --config .hallmark/india-playwright.config.ts --project=chromium --project=mobile-chromium --project=webkit tests/e2e/adaptive.spec.ts tests/e2e/scene.spec.ts tests/e2e/workspace-menu.spec.ts`: **53 passed, 1 failed**. The local config preserves the repository config and selects port 5175 because 5173 belongs to a different worktree.
- Failing case: mobile Chromium `drags a device to a new position and keeps simulation history`. The same case fails on an isolated rerun. Hit testing finds `.packet-inspector` covering the center of the device, so the synthetic drag reaches the panel instead of the node.
- Baseline comparison: injected all six original stylesheets from `HEAD` and restored the original font stylesheet in a fresh Pixel 7 context. The same panel covers the center and the drag leaves the device unmoved. This pre-existing overlap was not changed as part of the theme update. Desktop Chromium and WebKit dragging checks pass; mobile keyboard movement and canvas panning pass.
- Physical iOS/Android devices and Firefox were not checked. Mobile Chromium results are emulation; no new performance benchmark was run.
