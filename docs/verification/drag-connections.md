# Physical cable creation by dragging

## Scope and implementation

Each React Flow device exposes one visible connection dot. Drag between dots to create a physical Ethernet cable, or select two dots in sequence. The existing Topology → Connect ports inspector workflow remains available for explicit endpoint selection and keyboard use.

The controller selects the first unoccupied existing port on each device, in stored port order. It commits both endpoints as one configuration change through the normal validation and worker load pathway. This resets simulation history like an explicitly selected cable; moving devices still preserves history. Existing MAC addresses, IPv4 configuration, routes, DHCP and NAT settings are preserved. The modeled physical cable has no additional speed, duplex or cable-type parameters.

No ports are added. Missing devices, self-connections and exhausted ports fail without changing the configuration or history. Dropping on empty space cancels the gesture.

## Design references

Preserve the existing dark lab theme and token palette. The visible dot has a larger pointer/touch target; it must remain visible without hover. Use React Flow's connection preview rather than drawing a cable before the controller accepts it.

- Hallmark component guidance: `/Users/achillerossi/.agents/skills/hallmark/SKILL.md`.
- UI/UX Pro Max was unavailable in the configured local skill roots. Upstream fallback: [SKILL.md](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md), temporarily checked out at `/tmp/unipr-ui-ux-pro-max`.
- Verified UX database query: `dragging movements --domain ux` requires a single-pointer alternative and retained keyboard operation. Verified React query: `interactions --stack react` recommends testing visible behavior.

## Acceptance checks

- Drag creates a real stored cable using the first available ports.
- Later cables use remaining free switch/router ports.
- Reverse-direction and two-tap connections work.
- Empty-space drops leave topology unchanged.
- Exhausted endpoints report a recoverable input error and retain existing cables.
- Existing explicit endpoint selection, canvas panning and device movement remain usable.

## Verification

Verified locally on 2026-11-09 with Bun 1.3.8 and the repository's Node-based Vite/Vitest/Playwright tools:

- `bun run test`: 18 files, 104 tests passed.
- `bun run typecheck` and `bun run build`: passed.
- Cable-specific Playwright suite: 27 passed across Chromium, WebKit and Pixel 7 mobile Chromium emulation (9 cases per project), including real CDP touch drag and two-tap activation. Checks cover the enlarged hit target and cable attachment to the visible dot.
- Extended run of connection, scene, editor and ping suites: 44 passed, 1 failed. The failing case is mobile Chromium `drags a device to a new position and keeps simulation history` (`tests/e2e/scene.spec.ts:54`), also recorded before this change in [India theme verification](india-theme.md). Device movement/history tests passed on desktop Chromium and WebKit; mobile keyboard movement and blank-space panning passed.
- A mobile manual-port-selection check initially exposed the expanded guide covering the inspector. The guide is now concise and positioned above the dock on narrow/short screens; the manual selection test passes on all three projects.
- Visual inspection of `.hallmark/connections-chromium.png` and `.hallmark/connections-mobile-chromium.png` confirmed the visible orange connectors. The final attachment regression verifies that cables touch the dot rather than the boundary of its larger hit area.
- Browser runs used the ignored local `.hallmark/connections-playwright.config.ts`, extending the repository config with port 5186 and `reuseExistingServer: false`, to avoid the other worktree using port 5173. The final command was `bun run test:e2e --config .hallmark/connections-playwright.config.ts --project=chromium --project=mobile-chromium --project=webkit tests/e2e/connections.spec.ts`.

Firefox and physical iOS/Android phones were not checked. Browser emulation does not establish physical-phone coverage.

## Canvas deletion and removed cable panels

The Connections list and Ethernet connection inspector have been removed. A selected cable stays highlighted on the canvas without opening a panel. Plain Backspace or Delete removes the current device or cable through the existing controller actions; removing a device also removes its attached cables. Editing fields, editable text, dialogs, modified shortcuts, composition and key repeats do not trigger deletion. With no selection, deletion keys leave the topology unchanged and Backspace does not navigate away in WebKit.

Verification on 2026-11-09: `bun run test` (104 passed), `bun run typecheck` and `bun run build` passed. `tests/e2e/keyboard-deletion.spec.ts` passed all 18 cases across Chromium, WebKit and mobile Chromium emulation. Tests exercise pointer-selected cables, both keys, device/cable cleanup, reconnecting freed ports, normal field editing, dialogs, modifiers, and an empty selection. The connection suite also passed its 27 cases in the combined integration run; initial test setup issues with macOS Home key behavior and WebKit Backspace navigation were diagnosed and resolved. Hardware and Firefox coverage remain unchanged.
