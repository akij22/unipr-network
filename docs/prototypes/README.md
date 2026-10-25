# UniPRNetwork interface study

Open `interface-study.html` directly in a browser, or serve this directory with a static HTTP server. No package installation or build is required.

This is a throwaway interface prototype for comparing two structures, not the production frontend or a network simulation engine.

The current product design is consolidated in [the approved MVP specification](../superpowers/specs/2026-10-25-uniprnetwork-mvp-design.md). Its [implementation plan](../superpowers/plans/2026-10-25-uniprnetwork-mvp.md) covers the production work. These supersede historical stack and scope assumptions below: the production renderer is React Three Fiber, DHCP and NAT are included, and both computers and smartphones must support the full workflow. Prototype behavior remains illustrative.

- **A — Network canvas:** topology first, current-event explanation beside it on wide screens and below it on narrower screens.
- **B — Packet story:** persistent journey chapters, topology above a larger event explanation.
- **C — 3D network lab:** open `dark-network-lab.html` for the current mockup. Dark by default and entirely in English, with real Three.js/WebGL devices, spatial subnet platforms and cables, packet field comparisons and a device inspector.

Both directions contain prepared traces for a ping within a subnet, a ping across one router, and a missing-gateway failure. Events are educational milestones; some explicitly summarise several frame transmissions. Previous restores the displayed event and associated illustrative state.

Interactive controls: direction selection, next/previous/restart, scenario selection, protocol explanations, link details, device setup previews, global Tutorial toggle, named local saves and reopening. Setup values are kept separately and do not drive the prepared traces. A saved study stores its name, scenario and setup preview values; reopening starts its trace at the beginning. Browser storage errors are reported. These prototype saves use a dedicated localStorage key; production storage remains a separate design decision.

The topology is illustrative. Creating arbitrary connections, network validation, protocol execution and simulation history belong to the future React/TypeScript implementation with React Three Fiber. The prototype cannot validate the proposed simulator architecture. Production connections will use successive device/port selections on both touch and mouse.

All app text is English. The design assumes desktop use; the comparison also adapts to narrow viewports. Icons are inline SVG. Google Fonts are optional; fallback fonts work without network access.

`tokens.css` exports the palettes, typography and spacing used by the study. The HTML embeds the same tokens so it can be opened as a standalone file.

## Design sources

- Hallmark: local skill at `/Users/achillerossi/.agents/skills/hallmark/SKILL.md`, Map / Diagram and Narrative Workflow macrostructures, Cobalt and Grid directions, adapted to a working educational tool rather than a marketing page.
- UI/UX Pro Max: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill . Read upstream SKILL.md and queried its design-system generator, keyboard-focus UX guidance and React state/forms guidance. Its landing-page pattern did not fit this product and was discarded; interaction and accessibility guidance informed this prototype. Source checkout was consulted in `/tmp`; no global skill or app dependency was installed.

The specification now records the selected visual direction, event semantics, proposed persistence, and acceptance criteria. Detailed tutorial copy and responsive panel arrangements remain builder decisions within that design. Prototype approval is distinct from approval of the written design specification.

Protocol references consulted for the educational copy: [ARP, RFC 826](https://datatracker.ietf.org/doc/html/rfc826), [IPv4, RFC 791](https://www.rfc-editor.org/info/rfc791/), and [ICMP, RFC 792](https://www.rfc-editor.org/info/rfc792/).

## Dark network lab

This mockup follows the structure of the user-supplied interface reference, with the subsequent user corrections applied: playback and progress now sit above the topology and remain sticky while scrolling. The topology uses actual WebGL meshes and an orbitable camera. The original image's exact font cannot be identified from the screenshot; Space Grotesk, Inter and JetBrains Mono are the chosen implementation fonts.

The starting position is event 11 of the existing 14-event trace, when Router 1 forwards the Echo Request after resolving Host B. This keeps the earlier ARP events explicit. Changed MAC addresses and TTL are highlighted; the IP endpoints stay unchanged. The depth controls are Ethernet, Ethernet + IP and Full packet. ICMP is correctly labelled as network-layer content.

Clickable interactions include previous/next/seek, play/pause, device selection, inspector tabs, close/reopen inspector, protocol and link details, tutorial toggle, previews for all five apparatus types, configuration drafts, named local saves and reopening. Autoplay stops on interaction, at the final event and when the page is hidden. The mobile layout stacks the subnet regions and collapses the inspector; packet details remain in the packet section.

Configuration drafts are UI previews and do not recalculate the prepared trace. Names, current event, depth, tutorial preference and drafts can be saved under the separate localStorage key `uniprnetwork.dark-study.v1`. No real network engine, freeform editing or React Flow integration is implemented by this mockup.

The dark token export is `dark-network-tokens.css`; inline copies keep the HTML standalone. Verification is recorded in `dark-network-qa.md`. The earlier A/B mockup and its tokens remain available.

## 3D scene and renderer direction

`network-scene-3d.module.js` is the editable scene source, also embedded in the HTML for the inline artifact. It loads Three.js 0.186.1 and OrbitControls from version-pinned jsDelivr URLs. Internet access and WebGL are required for the prototype's 3D view. A loading error is shown if rendering or module loading fails.

The scene contains actual monitor/tower/keyboard meshes, wired router and switch appliances, shaded subnet platforms, tube-shaped cables, a selected-device ring and a packet cube. Hub and bridge have unconnected 3D setup previews when chosen from the device catalog. Floating labels are projected from world coordinates and avoid overlaps; labels and device shortcuts offer keyboard selection alongside physical mesh picking.

Drag to orbit, use the wheel to zoom, or right-drag to pan. Camera buttons and keyboard controls offer alternatives. Camera changes preserve simulation state. Previous/Next changes the prepared event and active cable without resetting the camera. Paused scenes render on demand; playback animates the packet. Reset view restores the initial camera. The previous flat topology is retained only as hidden compatibility markup for the illustrative trace; it is not displayed.

The user's 3D requirement revises the initial 2D renderer decision. React and TypeScript remain the application stack; Three.js is used in this spike, and React Three Fiber is the renderer selected by the approved MVP specification. React Flow is no longer the primary topology view. The independent TypeScript simulation engine and local persistence approach remain applicable. The production React Three Fiber integration has not yet been implemented; its work is described in the implementation plan linked above.

Primary renderer references: [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html), and [React Three Fiber introduction](https://r3f.docs.pmnd.rs/getting-started/introduction).
