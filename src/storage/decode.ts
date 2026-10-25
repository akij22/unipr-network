import type {
  Device,
  IPv4Address,
  NetworkConfig,
  Port,
  PortRef,
  Route,
  DhcpScope,
  NatConfig,
} from "../domain/types";
import { fail, issue, ok, type Result } from "../domain/types";
import { validateConfiguration } from "../domain/configuration";
import type { NetworkDocument } from "../app/types";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const address = (v: unknown): v is IPv4Address =>
  record(v) && text(v.ip) && finite(v.prefix);
const port = (v: unknown): v is Port =>
  record(v) &&
  text(v.id) &&
  (v.mac === null || text(v.mac)) &&
  (v.address === null || address(v.address));
const ref = (v: unknown): v is PortRef =>
  record(v) && text(v.deviceId) && text(v.portId);
const route = (v: unknown): v is Route =>
  record(v) &&
  text(v.id) &&
  address(v.destination) &&
  (v.nextHop === null || text(v.nextHop)) &&
  text(v.outPortId);
const scope = (v: unknown): v is DhcpScope =>
  record(v) &&
  text(v.id) &&
  text(v.portId) &&
  typeof v.enabled === "boolean" &&
  typeof v.first === "string" &&
  typeof v.last === "string" &&
  typeof v.gateway === "string";
const nat = (v: unknown): v is NatConfig =>
  record(v) &&
  typeof v.enabled === "boolean" &&
  Array.isArray(v.insidePortIds) &&
  v.insidePortIds.every(text) &&
  typeof v.outsidePortId === "string" &&
  Array.isArray(v.sourceNetworks) &&
  v.sourceNetworks.every(address);
function device(v: unknown): v is Device {
  if (
    !record(v) ||
    !text(v.id) ||
    !Array.isArray(v.ports) ||
    !v.ports.every(port)
  )
    return false;
  if (v.kind === "host")
    return (
      v.ports.length === 1 &&
      record(v.addressing) &&
      ((v.addressing.mode === "manual" &&
        (v.addressing.gateway === null || text(v.addressing.gateway))) ||
        (v.addressing.mode === "dhcp" && v.ports[0].address === null))
    );
  if (v.kind === "router")
    return (
      Array.isArray(v.routes) &&
      v.routes.every(route) &&
      Array.isArray(v.dhcpScopes) &&
      v.dhcpScopes.every(scope) &&
      (v.nat === null || nat(v.nat))
    );
  return (
    (v.kind === "switch" || v.kind === "bridge" || v.kind === "hub") &&
    v.ports.every((p) => p.address === null)
  );
}
function network(v: unknown): v is NetworkConfig {
  return (
    record(v) &&
    Array.isArray(v.devices) &&
    v.devices.every(device) &&
    Array.isArray(v.links) &&
    v.links.every(
      (l) =>
        record(l) &&
        text(l.id) &&
        Array.isArray(l.ends) &&
        l.ends.length === 2 &&
        l.ends.every(ref),
    )
  );
}
const vector = (v: unknown): v is [number, number, number] =>
  Array.isArray(v) && v.length === 3 && v.every(finite);
function document(v: unknown): v is NetworkDocument {
  if (
    !record(v) ||
    v.schema !== 1 ||
    !text(v.id) ||
    !text(v.name) ||
    !network(v.network) ||
    !record(v.layout) ||
    !record(v.view)
  )
    return false;
  const layout = v.layout;
  if (
    !v.network.devices.every((d) => {
      const p = layout[d.id];
      return record(p) && text(p.name) && finite(p.x) && finite(p.z);
    })
  )
    return false;
  return (
    vector(v.view.cameraPosition) &&
    vector(v.view.target) &&
    ["ethernet", "ip", "full"].includes(String(v.view.depth))
  );
}
export function decodeDocument(value: unknown): Result<NetworkDocument> {
  if (record(value) && value.schema !== 1)
    return fail(issue("SAVE_VERSION_UNSUPPORTED", [], {}, "input"));
  if (!document(value) || validateConfiguration(value.network).length)
    return fail(issue("SAVE_DATA_INVALID", [], {}, "input"));
  return ok(value);
}
