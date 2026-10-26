# Implementation decisions

These decisions extend the approved plan's interfaces where required by the specification. They do not add product features.

| Decision | Reason | Cost if wrong |
| --- | --- | --- |
| Scene types belong to presentation; runtime snapshots include the pending scheduler. Domain has its own no-DOM typecheck. | Historical restoration must include future queued work without presentation dependencies. | A missing scheduler field would corrupt replay; compile boundaries and exact-state replay tests cover this. |
| selectRoute accepts optional NetworkState. | DHCP addresses are learned state, not static configuration. | A caller omitting state cannot route a DHCP host; production paths and integration tests pass it. |
| Journal.initialize creates checkpoint zero; createHistory accepts an optional cache capacity. | Cold replay needs a complete starting state and a deliberately small test cache. | Incorrect initialization/eviction could lose early events; checkpoint and replay tests cover this. |
| Run Playwright invocations sequentially. | Concurrent invocations clean the same output directory. | Verification takes longer; application behavior is unaffected. |
| Web Locks protect active journals before abandoned-history cleanup. | Other tabs must retain their histories. | Browsers without Web Locks can retain orphaned temporary data; named saves remain separate. |
| Mobile uses a compact network/control group rather than a persistent overlay. | A sticky group blocked input in short landscape. Start/step restores the group to view. | Intentional scrolling to configuration/theory moves the network away; playback controls themselves never require scrolling away from its adjacent scene. |
| Queue changes contain added/removed actions. | Whole pending-queue snapshots inflated event storage quadratically. | A changed scheduler action must be represented on both sides; exact replay tests include queue time changes and checkpoint 50. |
| SceneRecovery receives the controller. | Context loss must pause playback while preserving the worker/document and recreate a real Canvas. | This adds a presentation prop; it does not couple the engine to graphics. |
| AppState exposes runtimeReady. | Failed configuration loads must not present learned state from the previous revision. Start retries the load. | New observation panels must honor readiness; tests cover failed load and retry. |
| Document-open viewEpoch is presentation-only and advances on successful reopen. | Restore a saved camera even when reopening the same ID, without resetting it on ordinary configuration edits. | A new view consumer must distinguish document reopen from visual updates. |

The final reviewer’s two lower-severity findings were raised to Important: missing loop highlights prevent the error’s advertised recovery, and a stale camera can leave a reopened topology out of view. Both were fixed with regressions; deferring them would preserve misleading recovery/navigation.

Physical-phone qualification and the Firefox launch failure are verification limitations, not silent exemptions or fabricated passes. See device-matrix.md. No branch merge, push or publication is performed by this implementation.

Final review rulings retain unverified physical-phone/OS-keyboard/GPU-eviction behavior and Firefox application behavior; hardware/browser-specific problems may remain. Performance beyond measured sizes is unqualified; larger networks may slow down, and no arbitrary device cap is imposed. Approved DHCP renewal/relay, cache/lease/NAT aging, nested NAT and general TCP/UDP NAT exclusions stand; users must follow the documented model boundaries.
