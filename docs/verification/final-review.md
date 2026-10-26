# Final branch review and fix pass — 2026-10-26

One fresh whole-branch review ran on Codex gpt-6-astra with high reasoning, reviewing ae39875..47964f8 against the approved spec/plan and implementation rulings. The preceding attempt failed at provider startup due to its usage limit and produced no review. No implementer subagents or second-opinion reviewers were used.

The reviewer reported no Critical findings, nine Important findings and two lower-severity findings. The executor confirmed all eleven. Loop highlighting was raised to Important because the error instructs learners to act on highlights that were missing. Camera restoration was raised to Important because reopening a topology could leave it outside the previous view. All entered one fix pass; none were deferred.

| Finding | Fix | Regression evidence |
| --- | --- | --- |
| Exact checkpoints and step zero produced an invalid exclusive IndexedDB key range | Return an empty delta slice when the checkpoint already equals the target | history.test.ts restores 0/50/100 with cache eviction; ping.spec.ts seeks zero and advances |
| Corrupt summary metadata crashed React before document decoding | Validate ID/name/timestamp before publishing summaries; show contextual feedback | documents.test.ts and review-regressions.spec.ts preserve the editor and Save |
| Name-only Apply discarded learned state and history | Equivalent validated network configurations preserve the projection; resolved validation errors clear | controller.test.ts; real DHCP→PAT UI scenario renames the acquired client without resetting lease/history |
| Failed loads leaked old leases and disabled retry | Gate DHCP observations and controls with runtime readiness; stale progress is withheld | recovery-controls.test.ts covers historic and active failures |
| Network/broadcast endpoint addresses and unsupported host /31s succeeded | Validate manual endpoint context; retain direct router /31 and /32 routes | topology.test.ts plus existing routing/checksum tests |
| DHCP pools collided across isolated LANs | Scope lease/offer occupancy to the server's Ethernet domain | dhcp.test.ts allocates the same private address independently on isolated LANs |
| Duplicate participating DHCP server addresses succeeded | Detect the server-address conflict in its Ethernet domain | dhcp.test.ts fails contextually while distinct competing-server tests remain green |
| Busy state disabled interruption; late replies/playback loops could revive cancelled work | Allow interruption; reject superseded request results and invalidate playback generations | controller.test.ts and held-response browser regression |
| Removed ping source remained hidden in local selection state | Derive displayed and submitted source from current host membership | review-regressions.spec.ts removes the selected host and successfully pings from the remaining host |
| L2-loop error links were not highlighted | Include reported issue links in scene projection | scene-view.test.ts highlights exactly the reported links |
| Saved camera pose was not restored without resize | Separate document-reopen view epoch from configuration/visual edits | camera browser regression compares label coordinates relative to the Canvas |

The new reproductions were observed failing before their fixes, then passing. The camera regression also ran against the former restore behavior as a negative control and failed by 204 pixels before restoration was re-enabled. The cancellation tests hold an old response, cancel before releasing it, and verify that late delivery cannot replace the restored projection. A fake-timer test reproduces and prevents duplicate playback loops after cancel/restart.

After the fix pass: **76/76 unit/integration tests**, **75/75 E2E cases** across Chromium, mobile Chromium and WebKit, typecheck and production build pass. The large lazy Three.js scene chunk warning remains documented. Performance measurements and native desktop samples are in performance.md. No post-fix reviewer was dispatched: regression tests plus the complete suites are the execution workflow's final gate.

## Considered limitations

- Physical phones, real OS keyboards and actual GPU eviction remain unverified. Emulation/synthetic events cannot replace them.
- Firefox application behavior is unverified because its installed binary fails before navigation; the launch failure was reproduced again on 2026-10-26.
- Native desktop samples cover 10/50/100/250 devices, not arbitrary networks or physical-phone performance. Larger networks may slow down; no count limit is fabricated.
- DHCP renewal/relay, learned-state aging, nested NAT and TCP/UDP PAT remain the approved model exclusions.

No Critical/Important findings remain unaddressed. No minor findings are deferred. This is a reviewable local implementation handoff, with the above environment qualifications; no merge, push or publication has been performed.
