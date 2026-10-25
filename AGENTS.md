# UniPRNetwork — Agent Guide

## Product direction

UniPRNetwork is an interactive computer-networking learning lab. Learners build and configure networks in a real 3D workspace, run simulations, and inspect packets, device state, and explanations to understand cause and effect. Favor observable, explainable network behavior over visual spectacle or commercial-device emulation.

Keep the simulation independent of its presentation so future protocols, learning tools, and scenarios can extend the same coherent model. This direction guides design decisions; it does not authorize additional features.

## Change scope and context

- Before changing a feature, inspect its implementation, tests, and relevant documentation. Treat historical plans and prototypes as context; confirm their assumptions against current requirements and behavior.
- Keep changes focused on the requested outcome. Internal types and extension points do not imply new product requirements; add UI, dependencies, abstractions, or architectural changes only when the task requires them.
- When changing modeled network behavior, keep simulation results, educational explanations, and tests consistent. Make intentional changes to existing behavior explicit.

## Architecture and Correctness

- Preserve the separation between the React presentation layer, the network simulation engine, and local persistence.
- Keep network models, validation, and protocol rules independent of React, Three.js, and the DOM.
- Execute simulation logic independently of rendering and animation timing.
- Keep simulation state deterministic and support reproducible navigation through historical events.

- Keep `src/domain/` and `src/simulation/` independent of React, Three.js, and the DOM. They own serializable network models, validation, and protocol rules. Use typed discriminated unions for packets, events, and errors; validate persisted data at runtime.
- Let `src/runtime/` own worker communication and reversible history. The worker is the sole writer of simulation state. Use deterministic virtual time and bounded work batches; reject stale responses using configuration revision, operation ID, and request ID.
- Keep `src/app/` and `src/features/` responsible for interaction and presentation. Scene, tables, packet inspection, and explanations must all use the same observed historical projection. Rendering and animation speed must never determine protocol outcomes.
- Generate events progressively. Previous/seek restores complete state without rerunning protocols; starting an operation requires the latest generated state. Preserve the distinction between cancellation, network reset, applied configuration changes, and visual edits defined in the specification.
- Keep named configurations separate from temporary history and learned state in `src/storage/`. Reopening starts a clean simulation. Handle storage failure without silently losing or overwriting configuration.
- Explain modeled network failures through simulation events. Keep invalid input, unsupported model behavior, and resource failures distinct; never fabricate success or silently repair the learner's network. Simulated packets stay inside the browser; the current architecture requires no simulation backend, account, or real Internet traffic.

## Frontend and learning experience

- Use `hallmark` and UI/UX Pro Max (`ux-ui-pro-max`) for frontend and UI design. Locate and read their skill instructions before design work; the implementation plan records the UI/UX Pro Max reference location and upstream fallback. Preserve the approved dark 3D lab direction.
- Write all application text, tutorials, errors, and educational content in English. Explain what happened and why, using only protocols actually involved; make modeling simplifications explicit.
- Support the core workflow on desktop and smartphone, with keyboard and touch alternatives to hover, precise dragging, and multi-touch gestures. Keep simulation controls reachable alongside a useful network view.
- Avoid fixed device-count limits. Base performance decisions on measurements; visual quality reductions must preserve simulation results. Report emulation and physical-device verification separately.
- Handle all application errors through consistent, user-friendly UI feedback. Never expose raw exceptions, stack traces, cryptic error codes, or generic error messages to users.
- Error messages must clearly explain what went wrong, why it happened when known, and what the user can do to resolve or recover from it.
- Use appropriate UI components (inline validation, contextual alerts, dialogs, or notifications) based on the error's severity and context. Avoid unnecessary or intrusive error popups.
- Distinguish application failures from network simulation failures. Explain simulated networking errors in educational terms, preserving their underlying cause and the relevant network concepts.
- Never silently swallow errors or fabricate successful outcomes. Preserve technical details for debugging without exposing them in the user-facing interface.


## Tooling and Verification

- Use the package manager and development tools configured in the repository.
- Inspect `package.json` before running build, lint, typecheck, or test commands.
- Run the relevant verification commands after code changes.
- Never invent commands or assume unavailable scripts exist.
- Report failed or unavailable checks explicitly.
- Do not consider prototype validation sufficient evidence of production correctness.

The repository now uses npm, Vite, Vitest and Playwright. Read package.json for current scripts. Verification evidence and outstanding hardware/browser coverage live in docs/verification/device-matrix.md and docs/verification/performance.md. Run Playwright invocations sequentially: concurrent runs clean the same test-results directory. Prototype QA does not establish production correctness.

## Keep guidance current

When architecture or significant behavior changes, update the relevant specification, plan, or verification document in the same change. Update this guide when durable boundaries or verified workflows change. Keep detailed contracts, feature inventories, and task progress in their dedicated documents.
