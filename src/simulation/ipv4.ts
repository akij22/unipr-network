import {
  fail,
  issue,
  ok,
  type NetworkConfig,
  type Result,
  type Device,
  type Port,
  type IPv4Address,
} from "../domain/types";
import { contains } from "../domain/ipv4";
import type { NetworkState } from "./types";
export type RouteSelection = {
  routeId: string;
  outPortId: string;
  nextHop: string;
};
export function addressOf(
  device: Device,
  port: Port,
  state?: NetworkState,
): IPv4Address | null {
  if (device.kind === "host" && device.addressing.mode === "dhcp") {
    const lease = state?.dhcpClients[device.id];
    return lease ? { ip: lease.ip, prefix: lease.prefix } : null;
  }
  return port.address;
}
export function selectRoute(
  config: NetworkConfig,
  deviceId: string,
  destination: string,
  state?: NetworkState,
): Result<RouteSelection> {
  const device = config.devices.find((d) => d.id === deviceId);
  if (!device) return fail(issue("DEVICE_NOT_FOUND", [deviceId], {}, "input"));
  const direct = device.ports
    .map((p) => ({ p, address: addressOf(device, p, state) }))
    .filter(
      (x): x is { p: Port; address: IPv4Address } =>
        x.address !== null && contains(x.address, destination),
    )
    .sort((a, b) => b.address.prefix - a.address.prefix);
  const staticRoutes =
    device.kind === "router"
      ? device.routes
          .filter((r) => contains(r.destination, destination))
          .map((r, i) => ({ r, i }))
          .sort(
            (a, b) =>
              b.r.destination.prefix - a.r.destination.prefix || a.i - b.i,
          )
      : [];
  if (
    direct.length &&
    (!staticRoutes.length ||
      direct[0].address.prefix >= staticRoutes[0].r.destination.prefix)
  )
    return ok({
      routeId: `connected:${device.id}:${direct[0].p.id}`,
      outPortId: direct[0].p.id,
      nextHop: destination,
    });
  if (staticRoutes.length) {
    const r = staticRoutes[0].r;
    const p = device.ports.find((p) => p.id === r.outPortId),
      a = p && addressOf(device, p, state);
    if (!a) return fail(issue("NO_ADDRESS", [deviceId]));
    if (r.nextHop && !contains(a, r.nextHop))
      return fail(issue("GATEWAY_OUTSIDE_SUBNET", [deviceId]));
    return ok({
      routeId: r.id,
      outPortId: r.outPortId,
      nextHop: r.nextHop ?? destination,
    });
  }
  if (device.kind === "host") {
    const gateway =
      device.addressing.mode === "manual"
        ? device.addressing.gateway
        : state?.dhcpClients[device.id]?.gateway;
    if (!gateway) return fail(issue("NO_GATEWAY", [deviceId]));
    const port = device.ports.find((p) => {
      const a = addressOf(device, p, state);
      return a && contains(a, gateway);
    });
    return port
      ? ok({ routeId: "default", outPortId: port.id, nextHop: gateway })
      : fail(issue("GATEWAY_OUTSIDE_SUBNET", [deviceId]));
  }
  return fail(issue("NO_ROUTE", [deviceId], { destination }));
}
