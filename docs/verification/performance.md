# Performance — measured 2026-10-25

Reproduce with `npm run test:performance`. Four serial fixtures contain 10, 50, 100 and 250 total devices: one switch, remaining manual IPv4 hosts, a star of Ethernet links, ping between two hosts. These are measurement sizes, not product limits.

Host: Mac17,3, macOS 27.0.1. Playwright Chromium 156.0.8078.4 uses **SwiftShader software rendering**, as recorded in each [raw JSON](measurements/50.json). The collaborative T3 browser separately reports Chromium 152.0.7977.167 / Electron 44.9.3 and ANGLE Metal Apple M5; no comparable timed GPU benchmark was collected there. Neither environment measures a physical phone.

| Devices | Orbit fps | Animation fps | Draw calls/frame | Start ms | First Next ms | Seek ms | Cancel ms | JS heap MB | Events | Serialized journal bytes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 | 57.1 | 58.5 | 16 | 57 | 61 | 52 | 50 | 64.0 | 30 | 49198 |
| 50 | 57.8 | 57.4 | 56 | 72 | 82 | 73 | 67 | 91.7 | 70 | 132184 |
| 100 | 41.7 | 55.6 | 106 | 64 | 66 | 107 | 81 | 97.4 | 120 | 236837 |
| 250 | 24.1 | 28.3 | 256 | 104 | 131 | 180 | 96 | 103.0 | 270 | 551533 |

The 50-device reference meets the initial 30 fps, 100 ms UI response and 500 ms first-event objectives in this local run. The 250-device topology is slower than the frame-rate objective and some actions exceed 100 ms; this is an observed limit, not a universal device threshold. Thermal conditions, real phone GPUs and real OS keyboard behavior remain unqualified. Results are single-run observations, not percentile guarantees.

Measurements count actual WebGL clear calls as rendered frames, and draw calls from WebGL draw methods. Orbit uses repeated camera button input over 1.2 seconds; animation samples one second of real Play. Demand rendering includes intentional idle periods, and repeated camera buttons include React/controller persistence costs. An earlier requestAnimationFrame count overstated render fps; those interim values are not used in this table. Start/Next/seek/cancel include Playwright interaction overhead and worker/storage round trips. Heap is Chromium's approximate performance.memory value. Serialized journal bytes sum semantic events for a completed ping; browser storage usage includes database overhead and the partial UI operation. Node engine timings in JSON include exact replay assertions, not just protocol execution.

## Changes justified by measurements

Before batching, the 250-device scene submitted about 1,594 draw calls per rendered frame and about 19.6 orbit fps. Shared instanced geometry reduces device rendering to one batch per material while preserving physical picking. A single projected label overlay suppresses overlapping labels based on screen space; the device list always retains every device. Instanced buffers and per-link geometries are disposed when replaced. The main UI loads separately from the roughly 948 kB scene chunk; the production build still reports a large-chunk warning.

History uses action additions/removals rather than copying the entire scheduler queue in every event: removing one action from a 1,000-action queue previously serialized 131,320 bytes; the regression now requires less than 400 bytes and complete replay equality. Tests also restore checkpoint 50 from IndexedDB after eviction of the memory cache. The growing fan-out fixtures preserve successful protocol results. Cancellation is exercised after the switch has queued its broadcast branches and remains responsive at the measured sizes.

No instancing, label reduction, render speed or DPR choice changes protocol outcomes. There is no fixed device-count cap. Worker batches contain up to 128 scheduler actions, yielding between batches; a single fabric fan-out still visits its finite outgoing ports. Extremely large single-switch port counts beyond these measurements are not a bounded-latency guarantee.
