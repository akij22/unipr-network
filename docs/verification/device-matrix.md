# Device and browser verification — 2026-10-26

Host: Apple hardware identifier Mac17,3, macOS 27.0.1. Node 26.11.1, npm 11.20.0. Production code is tested separately from historical mockups.

| Environment | Verification | Result |
| --- | --- | --- |
| T3 Chromium 152.0.7977.167 / Electron 44.9.3 on Apple M5 | Actual WebGL context, physical mesh picking, camera orbit, routed ping; 390×844 adaptive view inspected | Verified in collaborative browser; this is computer execution with a phone-sized viewport |
| Playwright Chromium 156.0.8078.4 | Full functional suite and adaptive widths | Passed |
| Playwright Pixel 7 Chromium profile | Touch workflow, editor, explicit DHCP→PAT, history, storage and recovery | Passed emulation, not physical Android |
| Playwright WebKit | Same functional suite, desktop and narrow layouts | Passed engine automation, not physical Safari iOS |
| Playwright Firefox, installed firefox-1555 | Launch attempted in normal temp directory, /tmp and an existing worktree profile | Unavailable: browser exits before navigation with “Could not find profile folder.” All-project npm run test:e2e reports failure; no tests silently skipped |
| Physical iPhone 13 / Safari | Proposed qualification reference | Not available; not verified |
| Physical Pixel 7 / Chrome | Proposed qualification reference | Not available; not verified |

Final functional suite after review fixes: 75 passing E2E cases across Chromium, mobile Chromium and WebKit. Unit/integration suite: 76 passing tests; typecheck and production build passed. A fresh final branch review and its regression fixes are recorded in final-review.md.

Viewport matrix: 320×568, 360×640, 375×667, 390×844, 414×896, 768×1024, 844×390 and 1280×800. Active-event controls and at least 160 CSS px of 3D scene remain visible together. No horizontal page overflow. The network and controls form one compact group; input/theory exploration can intentionally scroll it away. Starting or advancing an operation restores the network context.

Additional checks cover keyboard camera controls, reduced-motion preference, inspector focus return, keyboard-sized viewport shrink and rotation, named save/reopen, quota failure preserving configuration, two-tab journal safety and WebGL context recreation. A synthetic viewport shrink does not reproduce an actual OS keyboard. Context-loss automation dispatches the browser context-loss event and verifies Canvas recreation; real GPU eviction still needs hardware qualification.

## Physical-phone reproduction

Use HTTPS hosting accessible from each phone, record actual model/OS/browser/version and WebGL renderer. Build Host→Switch→Router→Host using touch and the port picker. Configure the router, enable a LAN DHCP scope and ICMP PAT, explicitly acquire a lease, ping the remote host, inspect NAT, step backward, save and reopen. Repeat portrait/landscape while editing with the OS keyboard. Verify Apply/Cancel reachability, focus after closing dialogs, accessible protocol details and the visible playback/network group. Background and foreground the app during Play; playback should remain paused after return. Trigger actual WebGL eviction if the browser supports a development mechanism, then retry the view and compare configuration/history. Run the topology sizes in performance.md and record thermal/power conditions. Leave unavailable measurements blank.

Native desktop measurements collected on 2026-10-26 report approximately 59–60 orbit fps for 10/50/100/250 devices on Metal Apple M5. See measurements/native-50.json and measurements/native-growing.json. These short desktop samples do not qualify physical phones.

## Canvas-first UI revision — 2026-10-26

The production workspace now uses the full available width until a device/link is selected. On desktop, selection opens a contextual side inspector; on smaller screens its configuration remains in document flow with an explicit Configure device shortcut. Playback is attached to the scene's lower edge and event explanations overlay it. Idle explanations and packet fields no longer occupy the initial viewport. The catalog explains automatic insertion followed by explicit grid positioning; single-click/tap placement and directional buttons preserve simulation history.

Verification for this revision (Bun 1.3.8): 76 Vitest tests passed; typecheck and production build passed. Chromium's 25 existing E2E cases and two new placement/catalog cases passed. WebKit and mobile Chromium cover the same 27 cases each, including the eight viewport sizes above. Three WebKit cases initially failed at navigation with `Could not connect to the server`; their recovery/save files were rerun separately. The mobile placement test exposed a guide overlapping the chosen grid point during an active event; positioning now pins the guide to the top, and the test passes using a touch tap. New checks exercise grid movement without history reset, keyboard movement, Escape, focus return and composer closure after successful submission. The camera-restoration assertion compares offsets from the canvas center because closing the contextual inspector intentionally expands the canvas.

T3 browser visual inspection: desktop 1280×800 plus 320, 375, 414 and 768 CSS-pixel widths; catalog, placement guidance and camera controls inspected. These are desktop execution and emulation, not physical-phone qualification. Firefox was not rerun for this presentation change; the prior launch limitation remains outstanding. No new sustained GPU/performance measurements were taken; performance.md's earlier measurements are historical evidence, not benchmarks of this revision. The production build continues to warn about the large lazy-loaded Three.js scene chunk.

### Full-screen workspace (2026-10-26)

The viewport is now a 100vw × 100dvh canvas. Playback/status, packet inspection, device inspection and remaining contextual tools float above it; the page itself does not scroll. The title/header, toolbar entry points, camera buttons and empty-state copy were intentionally removed. OrbitControls and the simulation/data model are unchanged. The previous +/− hint had no keyboard handler behind it.

The removed actions are retained in `src/app/use-workspace-actions.ts`: `toggleCatalog`, `startConnection`, `openPing`, `openSave`, `openNetworks`, `toggleTutorial`. Pass `renderActions` to `App` to bind future controls to the same state instance. `PingComposer`, `DeviceCatalog`, `SaveNetwork`, and `SavedNetworks` remain reusable exports. Existing UI-driven end-to-end scenarios that click the removed toolbar/camera buttons require new entry points before they can run unchanged; they are not evidence for this layout.

New coverage: `tests/e2e/fullscreen.spec.ts` checks viewport and renderer dimensions at 1440×900, 768×1024, 390×844, 320×568 and 844×390, no document overflow, canvas hit testing through empty overlay regions, reachable playback, removed chrome, and floating packet inspection. Browser emulation is distinct from physical-device verification; no physical-device checks were performed. Firefox launch is currently blocked by the installed browser reporting `Could not find profile folder`.

Results: typecheck and production build passed (existing large-chunk warning); all 76 Vitest tests passed. Both focused full-screen tests passed in Chromium, WebKit and mobile Chromium emulation (6/6). Production taste inspection at 1440/768/390 has zero failures with the explicitly requested missing title allowed, plus the preserved small-text warning. No complete legacy E2E-suite pass is claimed.

### Side menu entry points (2026-10-26)

`WorkspaceMenu` now reconnects the six retained actions through an overlay at the left edge: Add device, Connect ports, Send a packet, Save network, My networks and Tutorial mode. It is expanded on desktop and collapses below 70rem, with a keyboard/touch disclosure and Escape dismissal. Contextual panels open beside the menu on desktop and beneath its collapsed toggle on smaller screens. The full-screen canvas retains its dimensions. Packet composition can be closed and reopened, including after starting a ping. The exported actions hook and optional `App.renderActions` remain available for custom entry points.

Menu tests cover creating devices, disabled connection before two devices exist, connection cancellation, packet composition/reopening, ping start and playback focus, save/network dialogs, tutorial state and phone keyboard focus restoration. Coverage is browser emulation; physical-device and Firefox coverage remain outstanding as recorded above. The older full-screen test now expects the side menu while continuing to reject the removed header and camera chrome.

Side-menu results: production build and typecheck passed; 76 unit tests and 12 focused E2E cases passed across Chromium, WebKit and mobile Chromium emulation. A discovered phone collision between simulated-failure alerts and the menu toggle was corrected by placing narrow-screen alerts beneath the toggle. Production taste inspection remains at zero failures with the previously requested no-title exception and preserved small-text warning. The existing large 3D bundle build warning remains.
