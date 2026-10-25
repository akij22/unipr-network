# UniPRNetwork

A browser-based learning lab for Ethernet and IPv4. Build a real 3D topology, configure devices, then follow the decisions behind a ping or an explicit DHCP request. All interface and educational content is in English; the default theme is dark.

## Run locally

Node 26 and npm 11 were used for development. Install the locked dependencies and start Vite:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For phone testing on the same LAN, use the computer's LAN address. Production hosting should use HTTPS for workers, local storage and Web Locks. No simulation backend, account or real Internet traffic is required.

## Explore

1. Add hosts, switches, routers, bridges or hubs. Select them through the scene or the device list.
2. Configure their interfaces. Toggle Tutorial mode for guided explanations. Position buttons and port selectors provide alternatives to dragging.
3. Choose Connect ports and explicitly choose the two endpoints.
4. Open Send a packet, select a source and destination, and start a ping. For DHCP, apply Automatic (DHCP) on a host and explicitly request its configuration. Enable DHCP or ICMP PAT on a router as needed.
5. Use Next, Previous, Play and the generated-event slider. Click a protocol or packet heading to inspect theory. Tables, fields and the 3D view follow the same historical step.
6. Save a named configuration. My networks reopens it with clean simulation state. Data belongs to this browser and is not synchronized.

Configuration changes discard the trace and learned state while keeping the camera. Position/name/view changes preserve simulation state. Cancel rolls back the current operation; Reset clears learned ARP/MAC entries, DHCP assignments and PAT bindings. Starting from an old historical step is blocked.

## Verification

```sh
npm run test
npm run typecheck
npm run build
npm run test:e2e
npm run test:performance
```

Install the Playwright browsers with `npx playwright install chromium firefox webkit` if absent. Run Playwright invocations sequentially: they share an output directory. The performance suite is separate from functional E2E.

See [device coverage](docs/verification/device-matrix.md), [performance measurements](docs/verification/performance.md) and [acceptance evidence](docs/verification/acceptance.md). The local Firefox executable currently fails before loading the app; the all-project E2E command reports that failure. Chromium, mobile Chromium emulation and WebKit can also be run explicitly:

```sh
npm run test:e2e -- --project=chromium --project=mobile-chromium --project=webkit
```

Physical iOS and Android checks are pending availability. WebKit and Pixel emulation do not establish physical-phone performance.

## Architecture

- `src/domain`: serializable models, validation, IPv4 calculations and topology rules; no DOM, React or Three.js.
- `src/simulation`: deterministic virtual-time Ethernet, ARP, IPv4, ICMP, DHCP and ICMP PAT.
- `src/runtime`: worker protocol, progressive execution, revision checks and reversible historical projections.
- `src/storage`: validated versioned named documents and temporary IndexedDB journals.
- `src/app` and `src/features`: React interaction, real Three.js meshes through React Three Fiber, and educational inspection.

Events use state deltas, disk checkpoints every 50 events and a bounded 100-event memory cache. Rendering speed never decides protocol outcomes. Temporary journals use Web Locks to avoid deleting another tab's active history. Named documents contain configuration, identity, layout and view, without learned state.

## Modeling boundaries

The lab models wired Ethernet without collisions, VLANs, STP, Wi-Fi or vendor CLI. Ethernet loops block simulation; routed loops terminate using TTL. ARP retries are finite and caches do not expire automatically. IPv4 packets fit the MTU without fragmentation. Router-to-router /31 links are supported; /31 is not a DHCP LAN.

DHCP uses broadcast DORA, router-integrated servers and infinite leases, without renewal, relay or DNS options. NAT supports ICMP Echo identifiers and corresponding replies/errors, without TCP/UDP PAT, nested NAT or port forwarding. ICMP is a network-layer control protocol. Explanations and packet fields state these simplifications.

No fixed device-count limit is imposed. Large scenes and histories consume browser resources; measured results and current limits are documented rather than inferred from device count.
