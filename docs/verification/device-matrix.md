# Device and browser verification — 2026-10-25

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

Functional suite after Task 12: 63 passing E2E cases across Chromium, mobile Chromium and WebKit. Unit/integration suite: 64 passing tests; typecheck and production build passed. A fresh final branch review is recorded separately.

Viewport matrix: 320×568, 360×640, 375×667, 390×844, 414×896, 768×1024, 844×390 and 1280×800. Active-event controls and at least 160 CSS px of 3D scene remain visible together. No horizontal page overflow. The network and controls form one compact group; input/theory exploration can intentionally scroll it away. Starting or advancing an operation restores the network context.

Additional checks cover keyboard camera controls, reduced-motion preference, inspector focus return, keyboard-sized viewport shrink and rotation, named save/reopen, quota failure preserving configuration, two-tab journal safety and WebGL context recreation. A synthetic viewport shrink does not reproduce an actual OS keyboard. Context-loss automation dispatches the browser context-loss event and verifies Canvas recreation; real GPU eviction still needs hardware qualification.

## Physical-phone reproduction

Use HTTPS hosting accessible from each phone, record actual model/OS/browser/version and WebGL renderer. Build Host→Switch→Router→Host using touch and the port picker. Configure the router, enable a LAN DHCP scope and ICMP PAT, explicitly acquire a lease, ping the remote host, inspect NAT, step backward, save and reopen. Repeat portrait/landscape while editing with the OS keyboard. Verify Apply/Cancel reachability, focus after closing dialogs, accessible protocol details and the visible playback/network group. Background and foreground the app during Play; playback should remain paused after return. Trigger actual WebGL eviction if the browser supports a development mechanism, then retry the view and compare configuration/history. Run the topology sizes in performance.md and record thermal/power conditions. Leave unavailable measurements blank.
