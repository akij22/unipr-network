# UniPRNetwork

A browser-based learning lab for Ethernet and IPv4. Build a topology on a React Flow canvas, configure devices, then follow the decisions behind a ping or an explicit DHCP request. All interface and educational content is in English; the default theme is dark.

## Run locally

Use Bun 1.3.8 (pinned in `package.json`) for dependency installation and scripts. Keep Node 26 available for the existing Vite, Vitest and Playwright CLIs; this migration retains their Node runtime. Install the locked dependencies and start Vite:

```sh
bun install --frozen-lockfile
bun run dev
```

Open the URL printed by Vite. For physical-phone testing, serve the app through a trusted HTTPS development proxy or HTTPS hosting; plain LAN HTTP does not provide all required browser APIs. Production hosting should use HTTPS. No simulation backend, account or real Internet traffic is required.

## Explore

The top bar holds four menus for the existing workspace actions.

1. **Topology → Add device** (or the **+** dock centred at the bottom) adds hosts, switches, routers, bridges or hubs. Adding a device never opens the inspector. Select a device directly on the canvas to configure it. Drag empty space to pan; use the mouse wheel or pinch to zoom.
2. Drag devices to arrange the topology, then configure their interfaces. **Help → Tutorial mode** enables guided explanations. Focus a device and use the arrow keys to adjust its position; port selectors let you connect interfaces.
3. Drag from the orange dot on a device to another device’s dot to create a physical cable. The first free existing ports are selected automatically; IP settings and routes are preserved. You can also tap two dots in sequence, or focus each dot and press Enter/Space. **Topology → Connect ports** keeps explicit endpoint selection available. If all ports are occupied, disconnect a cable or add a port where supported. Select a cable or device on the canvas and press **Backspace** or **Delete** to remove it; removing a device also removes its attached cables. These shortcuts do not act while editing a field or using a dialog.
4. Open **Simulation → Send a packet**, select a source and destination, and start a ping. For DHCP, apply Automatic (DHCP) on a host and explicitly request its configuration. Enable DHCP or ICMP PAT on a router as needed.
5. Once a ping or simulation starts, the playback row (Next, Previous, Play and the generated-event slider) appears under the menus; it stays for reviewing history and hides again on Reset, Cancel or a configuration change. Click a protocol or packet heading to inspect theory. Tables, fields and the topology canvas follow the same historical step.
6. **File → Save network** stores a named configuration; **File → My networks** reopens it with clean simulation state. Data belongs to this browser and is not synchronized.

Configuration changes discard the trace and learned state while keeping the canvas view. Position/name/view changes preserve simulation state. Reopening restores the saved canvas position and zoom; older configurations are fitted to the current viewport. Cancel rolls back the current operation; Reset clears learned ARP/MAC entries, DHCP assignments and PAT bindings. Starting from an old historical step is blocked.

## Verification

```sh
bun run test
bun run typecheck
bun run build
bun run test:e2e
bun run test:performance
```

Use `bun run test` to run the existing Vitest suite; `bun test` invokes a different test runner. Commit dependency changes with `bun.lock`, the project’s only lockfile.

Install the Playwright browsers with `bun run playwright install chromium firefox webkit` if absent. Run Playwright invocations sequentially: they share an output directory. The performance suite is separate from functional E2E.

See [device coverage](docs/verification/device-matrix.md), [performance measurements](docs/verification/performance.md) and [acceptance evidence](docs/verification/acceptance.md). The local Firefox executable currently fails before loading the app; the all-project E2E command reports that failure. Chromium, mobile Chromium emulation and WebKit can also be run explicitly:

```sh
bun run test:e2e --project=chromium --project=mobile-chromium --project=webkit
```

Physical iOS and Android checks are pending availability. WebKit and Pixel emulation do not establish physical-phone performance.

## Architecture

- `src/domain`: serializable models, validation, IPv4 calculations and topology rules; no DOM, React or Three.js.
- `src/simulation`: deterministic virtual-time Ethernet, ARP, IPv4, ICMP, DHCP and ICMP PAT.
- `src/runtime`: worker protocol, progressive execution, revision checks and reversible historical projections.
- `src/storage`: validated versioned named documents and temporary IndexedDB journals.
- `src/app` and `src/features`: React interaction, the React Flow topology canvas, and educational inspection. Legacy Three.js components remain in the source tree but are outside the active workspace.

Events use state deltas, disk checkpoints every 50 events and a bounded 100-event memory cache. Rendering speed never decides protocol outcomes. Temporary journals use Web Locks to avoid deleting another tab's active history. Named documents contain configuration, identity, layout and view, without learned state.

## Modeling boundaries

The lab models wired Ethernet without collisions, VLANs, STP, Wi-Fi or vendor CLI. Ethernet loops block simulation; routed loops terminate using TTL. ARP retries are finite and caches do not expire automatically. IPv4 packets fit the MTU without fragmentation. Router-to-router /31 links are supported; /31 is not a DHCP LAN.

DHCP uses broadcast DORA, router-integrated servers and infinite leases, without renewal, relay or DNS options. NAT supports ICMP Echo identifiers and corresponding replies/errors, without TCP/UDP PAT, nested NAT or port forwarding. ICMP is a network-layer control protocol. Explanations and packet fields state these simplifications.

No fixed device-count limit is imposed. Large topologies and histories consume browser resources; measured results and current limits are documented rather than inferred from device count. Measurements of the former 3D renderer do not establish React Flow performance.
