# Dark network lab verification

## Current 3D revision

The topology has been replaced by real Three.js 0.186.1 WebGL geometry. The earlier checks below describe the preceding interface and remain historical evidence, rather than a claim that every check was repeated on every revision.

17 additional browser checks passed for the 3D revision: WebGL readiness, four actual device groups, hidden flat topology, camera orbit, orbit preserving the event, camera zoom, camera reset, Previous/Next state synchronisation, packet status, projected-label selection, keyboard device selection, real hub setup preview, preview cleanup, route tables, sticky simulation controls and stepping without scrolling. Physical mesh picking was checked by dispatching a pointer click on the rendered Host A model and confirming the host inspector opened.

The playback dock previously began at approximately 1069px on a 1280px-wide page. It now begins at approximately 150px, before the network, and remains at 12px from the viewport top while scrolling. The viewport test used 1280×800. Earlier in this revision, nine targeted checks confirmed positioning, sticky behavior, scroll stability and device selection.

The 3D scene was visually checked at 320, 375, 414, 728, 768 and 1280px. The engine and camera controls loaded successfully. The headless browser reports software-rendering performance warnings; these are environment diagnostics, not application exceptions. No 2D fallback is presented as a 3D scene. The scene's source module and its inline copy are kept identical.

## Earlier interface checks

Verified on 2026-10-24 using T3 HTML Preview and the collaborative browser. JavaScript syntax checked with `node --check`.

31 browser checks passed across these behaviors:

- English document language and dark default.
- Initial router-forwarding comparison; previous/next synchronization.
- ARP represented directly in Ethernet, and unchanged IPv4 endpoints during forwarding.
- Ethernet, Ethernet + IP and Full packet field selection.
- Tutorial on/off and device inspector selection.
- Router interface configuration, route and ARP tables, and activity explanations.
- Earlier events removing future learned ARP mappings.
- Keeping/cancelling configuration drafts and host gateway fields.
- Switch learning the router's local MAC rather than the remote host's MAC.
- Protocol and link dialogs, including full MAC addresses.
- Setup previews for Host, Router, Switch, Bridge and Hub.
- Navigation limits, named saves, listing and reopening at the saved event.
- Playback starting and stopping on reaching the final event.

Visual previews checked at 320, 375, 414, 728, 768 and 1440 CSS pixels. No document horizontal overflow was reported. The narrow topology uses its own SVG coordinate system to align connections with stacked devices. Reduced motion, visible focus, dialog keyboard handling, and keyboard-operable inspector tabs are provided.

Representative computed WCAG contrast ratios:

| Pair | Ratio |
| --- | ---: |
| Body / panel | 10.74 |
| Muted / panel | 6.78 |
| Field value / field | 16.40 |
| Primary button text / fill | 6.34 |
| Changed field text / fill | 7.97 |
| Active route text / fill | 7.22 |
| Configuration note text / fill | 9.42 |
| Focus / panel | 10.33 |

These checks validate this interface study and illustrative state. They do not validate a network simulation engine or constitute a formal accessibility audit. Configuration drafts intentionally do not drive the prepared trace. Fonts are optional remote resources with local fallbacks.

Hallmark informed the reference-derived structure, named tokens, restrained hierarchy and meaningful visual annotations. UI/UX Pro Max's contrast and non-color-only guidance was applied. Its generic landing-page/glass recommendations did not match this reference-based educational workspace and were not used.
