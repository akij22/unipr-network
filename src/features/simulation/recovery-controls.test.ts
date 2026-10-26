import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { createAppController } from "../../app/controller";
import { createSession } from "../../runtime/session";
import { memoryJournal } from "../../../tests/helpers/memory-journal";
import { fixture } from "../../../tests/fixtures/networks";
import { DhcpClient } from "../services/DhcpClient";
import { PingComposer } from "./SimulationControls";
for (const phase of ["historic", "active"]) {
  it(`withholds old DHCP assignments and permits retry after a failed load from ${phase}`, async () => {
    const session = createSession(
      { devices: [], links: [] },
      0,
      memoryJournal(),
    );
    let refuse = false;
    const app = createAppController({
      request: (r) =>
        refuse && r.command.type === "load"
          ? Promise.resolve({
              ok: false as const,
              issue: {
                code: "WORKER_FAILURE",
                category: "resource" as const,
                deviceIds: [],
                linkIds: [],
                params: {},
              },
            })
          : session.handle(r),
      dispose() {},
    });
    const n = fixture("dhcp");
    await app.dispatch({ type: "config.apply", network: n });
    await app.dispatch({
      type: "simulation.start",
      operation: { kind: "dhcp", hostId: "a" },
    });
    while (app.getSnapshot().projection.status === "active")
      await app.dispatch({ type: "simulation.next" });
    if (phase === "historic")
      await app.dispatch({ type: "simulation.previous" });
    else
      await app.dispatch({
        type: "simulation.start",
        operation: { kind: "ping", sourceId: "a", destination: "192.168.1.1" },
      });
    const changed = structuredClone(n);
    changed.devices.find((d) => d.kind === "router")!.ports[1].address!.ip =
      "192.168.3.1";
    refuse = true;
    await app.dispatch({ type: "config.apply", network: changed });
    const dhcp = renderToStaticMarkup(
        createElement(DhcpClient, { controller: app, deviceId: "a" }),
      ),
      ping = renderToStaticMarkup(
        createElement(PingComposer, { controller: app }),
      );
    expect(dhcp).not.toContain("Assigned IPv4:");
    expect(dhcp).not.toMatch(/<button[^>]*disabled/);
    expect(ping).not.toMatch(/<button[^>]*disabled/);
    app.dispose();
  });
}
