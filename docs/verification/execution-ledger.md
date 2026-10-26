# SDD ledger — plan: docs/superpowers/plans/2026-10-25-uniprnetwork-mvp.md
Baseline: ae39875; isolated feat/network-lab-mvp. No baseline package or tests existed.
Pre-flight: Tasks 1→2→3→4: NetworkConfig, ports, packets, scheduler and state match contracts.
Pre-flight: Tasks 4→5: Simulator snapshots and progressive advance match worker/history.
Pre-flight: Tasks 5→6→7→8: projection, document and controller signatures match scene and playback.
Pre-flight: Tasks 4→9→10: Operation DHCP extension and ICMP PAT share existing engine interface.
Pre-flight: Tasks 5→11: shared IndexedDB schema uses document unknown until runtime decoding.
Pre-flight: Tasks 6→11: NetworkDocument and controller save/open actions match.
Pre-flight: Tasks 7→12 and 8→12: adaptive scene and playback consume same projection.
Ruling: Scene types stay presentation-only; runtime snapshots include pending scheduler state. Domain must compile without DOM/React — specification — separate typecheck project.
Task 4: Diagnosis: six ARP requests arose from an originating host sending an ICMP error to itself after ARP failure. Hosts now report origin failures locally; only routers generate transit ICMP errors.
Ruling: selectRoute accepts optional NetworkState for DHCP-assigned addresses — runtime leases cannot be written into static configuration — three-argument callers unchanged.
Task 5: Diagnosis: cached event queue deltas referenced live state arrays; later engine steps mutated history. diffState now owns copies. Replay test failed before fix and passes after.
Ruling: Journal.initialize is added for checkpoint zero, and createHistory accepts optional cache capacity for eviction tests — needed to prove cold replay — production default remains 100.
Task 9: Added DHCP transaction/server-selection state and real BOOTP/UDP encoding. Null DHCP assignments must remain explicit null on historical replay; regression test failed before preserving null entries.
Task 10: completion reopened: unit suite passed, but combined DHCP→PAT E2E did not observe a translation. Investigating before starting Task 11; earlier task-done line alone is insufficient evidence.
Task 10: combined scenario passes after waiting for aria-busy=false before checking completion; test had mistaken the preceding DHCP completion for the new ping. Real worker was correctly at Step 0.
Ruling: Playwright invocations must run sequentially — separate runs clean the shared test-results directory and caused ENOENT at teardown when run concurrently. This is verification orchestration, not a product failure.
Task 1: complete (commits ae39875..34f312f, tests: npm run test →    Duration  103ms (import 40%, transform 26%, tests 20%, worker 14%, environment 1%))
Task 2: complete (commits 34f312f..90c449d, tests: npm run test →    Duration  109ms (import 40%, transform 28%, tests 18%, worker 13%, environment 1%))
Task 3: complete (commits 90c449d..91a47ee, tests: npm run test →    Duration  123ms (import 43%, transform 22%, tests 19%, worker 16%, environment 1%))
Task 4: complete (commits 91a47ee..0600dac, tests: npm run test →    Duration  144ms (import 42%, tests 22%, transform 22%, worker 14%, environment 1%))
Task 5: complete (commits 0600dac..85759b9, tests: npm run test →    Duration  165ms (import 44%, tests 24%, transform 22%, worker 10%))
Task 6: complete (commits 85759b9..9a71a56, tests: npm run test →    Duration  174ms (import 43%, transform 28%, tests 21%, worker 8%))
Task 7: complete (commits 9a71a56..3754006, tests: npm run test →    Duration  300ms (transform 38%, import 36%, tests 18%, worker 8%))
Task 8: complete (commits 3754006..cb69646, tests: npm run test →    Duration  263ms (import 40%, transform 26%, tests 25%, worker 8%))
Task 9: complete (commits cb69646..cfedebc, tests: npm run test →    Duration  276ms (import 36%, tests 33%, transform 24%, worker 8%))
Task 10: complete (commits cfedebc..be5daa7, tests: npm run test →    Duration  284ms (import 36%, tests 34%, transform 23%, worker 7%))
Task 10: complete (commits cfedebc..a86c62e, tests: npm run test:e2e -- tests/e2e/nat.spec.ts →   2 passed (11.2s))
Task 11: Ruling: Web Locks protect active temporary journals across tabs; startup cleans only unlocked abandoned journals — deleting another tab's history is unsafe — browsers without Web Locks retain temporary data until explicit cleanup.
Task 11: Fixed delayed journal initialization installing an obsolete operation after a new configuration load; regression RED→GREEN. Storage tests cover quota, atomic duplicate-name handling, malformed/versioned records, and blocked upgrades. Browser save/reopen/quota and two-tab cleanup: 6 passed.
Task 11: complete (commits be5daa7..1b3d87e, tests: npm run test →    Duration  300ms (tests 38%, import 35%, transform 21%, worker 6%))
Task 12: Ruling: mobile playback uses one viewport-sized network/control group, brought into view when an operation starts, rather than a persistent overlay — a sticky 380px group prevented input access in 390px landscape — users intentionally scrolling to theory/configuration can scroll the group away.
Task 12: Ruling: queue deltas record removed/added actions instead of whole pending queues — measured 131,320 bytes for removing one of 1,000 actions; regression requires under 400 bytes and exact replay — specialized serialization must retain changed scheduler times.
Task 12: Ruling: SceneRecovery receives the controller to pause playback and recreate a lazy Canvas — preserving document/worker state requires presentation-only recovery — an extra prop differs from the plan's generic children signature.
Task 12: Genuine RED→GREEN: responsive group/recovery; inspector focus return; compact queue serialization; failed worker-load readiness; instanced physical picking. Added coverage for a real L3 cycle, return-route absence and cold checkpoint 50.
Task 12: Timed actual rendered frames, not requestAnimationFrame callbacks. 250-device SwiftShader orbit remains below 30fps after draw-call and label improvements; 50-device reference meets targets. No device cap or fabricated hardware result. Physical iOS/Android unavailable; Firefox exits before navigation with 'Could not find profile folder' across three profile-location attempts.
Task 12: Ruling: add runtimeReady to the presentation state — after a failed configuration load every view must withhold old learned state, and Start retries loading before execution — every new observed-state consumer must honor this flag.
Task 12: An overlapping address on a different LAN exposed a false ping success when a reply reached the wrong host. Regression failed with operation.completed; now completion requires the initiating device, remote source, Echo identifier and sequence. Unit suite 64/64.
Task 12: complete (commits 1b3d87e..47964f8, tests: npm run test →    Duration  344ms (tests 40%, transform 30%, import 25%, worker 4%))
Final review: dispatched one fresh whole-branch reviewer, codex gpt-6-astra, high reasoning/default tier, range ae39875..47964f8. Review package and all rulings supplied. No implementer subagents used.
Final review r1 failed before review due to provider usage limit; no findings produced. Retried fresh reviewer r2 on 2026-10-26 with the same scope/model/options. Final pre-review E2E log confirms 63/63 passed.
Final QA 2026-10-26: 64 unit/integration tests, typecheck and build pass; 63 E2E cases pass again on Chromium/mobile Chromium/WebKit. Firefox launch failure reproduced. Native T3 Metal Apple M5 sample: 50 devices, 89 actual rendered frames / 1504.3ms = 59.16fps, 56 draw calls/frame; raw evidence saved for final documentation update.
Final review r2 completed: no Critical; nine Important findings confirmed by reproductions. All enter one fix pass.
Final: Ruling: re-grade missing L2-loop highlighting as Important — the error instructs learners to remove highlighted links but provides none, preventing the intended recovery on larger networks — keeping it Minor would ship misleading guidance.
Final: Ruling: re-grade saved-camera restoration as Important — reopening a different topology may leave its devices outside the previous camera view, breaking the saved-view/navigation contract — keeping it Minor would hide valid reopened networks until manual reset.
Final: Ruling: physical-phone/OS-keyboard/actual-GPU-eviction qualification remains unverified — unavailable hardware cannot be replaced by emulation claims — mobile hardware-specific failures could remain.
Final: Ruling: Firefox application behavior remains unverified — browser exits before navigation, reproduced again on 2026-10-26 — Firefox-specific app problems could remain.
Final: Ruling: performance beyond measured configurations is unqualified and no device cap is invented — native desktop fixtures now measure 10/50/100/250 but do not establish arbitrary-size or phone performance — larger networks can slow down.
Final: Ruling: DHCP renewal/relay, cache/lease/NAT aging, nested NAT and general TCP/UDP NAT remain the approved exclusions — this fix pass addresses modeled behavior only — users must consult the explicit modeling boundaries.
Final fix RED gate: 10 new failing unit/integration cases reproduce checkpoint boundaries, corrupt metadata, name-only Apply, failed-load DHCP observations/retry, invalid endpoints, isolated DHCP pools, duplicate DHCP servers, late cancellation replies and L2-loop highlights. Browser regressions cover interruption, stale source, corrupt metadata and reopening camera pose.
Final: Ruling: use a presentation-only viewEpoch on successful document reopen — camera restore must run even for the same document ID without resetting on config or visual edits — future view consumers must distinguish reopening from ordinary updates.
Final fix pass: all eleven confirmed findings implemented. A follow-on cancellation regression exposed an old playback loop reviving after cancel/restart; RED cursor 3 versus expected 2, now GREEN with playback generation. Equivalent valid Apply also clears resolved input errors without clearing history. Camera negative control with former behavior fails by 204px; actual fixed camera test passes.
Final: fixed exact checkpoint/zero history — cold IndexedDB boundary regression RED→GREEN, suite 76/76.
Final: fixed corrupt saved summary crash — metadata repository and saved-menu browser regressions RED→GREEN, suite 76/76.
Final: fixed name-only Apply resetting history — controller regression RED→GREEN and actual DHCP→PAT rename preserves lease/frontier, suite 76/76.
Final: fixed failed-load DHCP observations/retry — historic/active rendered controls and failed-reopen recovery RED→GREEN, suite 76/76.
Final: fixed reserved endpoint and unsupported host /31 success — contextual address validation regression RED→GREEN, suite 76/76.
Final: fixed DHCP occupancy across isolated LANs — isolated overlapping pool regression RED→GREEN, suite 76/76.
Final: fixed duplicate DHCP server success — participating server-address conflict regression RED→GREEN, suite 76/76.
Final: fixed interruption during pending work and stale responses/playback loops — held-response browser/controller and fake-timer regressions RED→GREEN, suite 76/76.
Final: fixed stale removed ping source — actual removal/browser ping regression RED→GREEN, suite 76/76.
Final: fixed L2-loop highlights — scene projection regression RED→GREEN, suite 76/76.
Final: fixed saved camera restore — browser pose regression RED→GREEN with former-behavior negative control, suite 76/76.
Final verification: npm run test 76/76; npm run typecheck exit 0; npm run build exit 0 with documented lazy-scene chunk warning; Chromium/mobile Chromium/WebKit E2E 75/75; performance fixtures 4/4. Firefox launch remains unavailable, physical phones unverified. Native desktop GPU measurements and all considered limitations recorded in docs/verification/.
Final review fix pass complete; no unaddressed Critical/Important findings, no deferred minor findings. Preserve branch and externally managed worktree; no merge/push/publication authorized.
