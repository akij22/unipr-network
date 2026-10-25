# Acceptance evidence

Specification: ../superpowers/specs/2026-10-25-uniprnetwork-mvp-design.md. Tests exercise production modules and the real browser worker. Historical prototype QA is not evidence for this implementation.

| Criterion | Evidence |
| --- | --- |
| 1 · Five device kinds, explicit configuration and cables | app/controller.test.ts, domain/topology.test.ts; editor.spec.ts, scene.spec.ts; catalog and position controls |
| 2 · ARP, MAC learning and cache reuse/reset | simulation/engine.test.ts and ethernet.test.ts; ping.spec.ts |
| 3 · Routed ping, TTL/MAC changes, fixed IP endpoints | simulation/engine.test.ts checksum assertions; ping.spec.ts through real worker |
| 4 · Multiple routers, longest prefix, defaults, return routes and L3 cycle | simulation/engine.test.ts includes a three-router TTL loop and missing/restored return route |
| 5 · Hub/bridge/switch behavior, broadcast branches and L2 cycle | simulation/ethernet.test.ts, domain/l2-cycles.test.ts; each branch is a separate link event sharing rootId |
| 6 · Explicit DORA, distinct leases, no server, exhausted pool, competing offers | simulation/dhcp.test.ts; dhcp.spec.ts and combined nat.spec.ts |
| 7 · ICMP PAT, equal inside identifiers, correct replies and error quotes/checksums | simulation/nat.test.ts; nat.spec.ts |
| 8 · Complete historical restoration, no replay mutation or start in history | runtime/session.test.ts, runtime/history.test.ts includes cold checkpoint 50 plus pending broadcast queue; ping.spec.ts, nat.spec.ts |
| 9 · Config changes, stale replies, visual-only edits, Reset versus Cancel | runtime/session.test.ts, app/controller.test.ts including failed worker load recovery |
| 10 · Progressive generation and unknown total | engine.start queues only; session/engine tests and controls that expose generated-event range without a total percentage |
| 11 · Named configs, clean reopen, validation and storage recovery | storage/documents.test.ts; saves.spec.ts, history-storage.spec.ts |
| 12 · English teaching and distinct application/network failures | content/present.test.ts, English content catalog, quota/storage and ping failure checks; no raw exception UI |
| 13 · Prefix/packet inspection including /31 and /32 | domain/ipv4.test.ts; PrefixExplorer and PacketInspector consume actual observed values |
| 14 · Mouse/touch/keyboard, visible network/controls, recovery and performance | adaptive.spec.ts, recovery.spec.ts, scene.spec.ts and performance.spec.ts; physical phone and Firefox limitations in device-matrix.md |

Paths in the evidence column are relative to src/ or tests/e2e/. Automated browser coverage does not prove assistive-technology compatibility or physical-phone performance. No fixed device count limit is implemented. Production build succeeds with a large lazy-loaded Three.js scene chunk warning; dependency R3F currently emits a Three.Clock deprecation notice in development.
