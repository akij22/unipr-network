import {
  issue,
  type Issue,
  type NetworkConfig,
  type PortRef,
} from "../domain/types";
import { formatIPv4, parseIPv4 } from "../domain/ipv4";
import {
  BROADCAST,
  type DhcpMessage,
  type EthernetFrame,
  type IPv4Packet,
  type Lease,
} from "./packets";
import type { NetworkState, EventKind, EventDetail, ProtocolId } from "./types";
import { sealPacket } from "./checksums";
export type DhcpContext = {
  state: () => NetworkState;
  frame: (
    from: PortRef,
    dstMac: string,
    payload: EthernetFrame["payload"],
  ) => EthernetFrame;
  transmit: (from: PortRef, frame: EthernetFrame) => void;
  retry: (hostId: string, attempt: number, delay: number) => void;
  choose: (hostId: string) => void;
  stop: (problem: Issue) => void;
  emit: (
    kind: EventKind,
    devices: string[],
    protocols: ProtocolId[],
    detail?: EventDetail,
    before?: EthernetFrame[],
    after?: EthernetFrame[],
  ) => void;
};
export function createDhcpProtocol(config: NetworkConfig, ctx: DhcpContext) {
  const stack: ProtocolId[] = ["ethernet", "ipv4", "udp", "dhcp"];
  const send = (from: PortRef, sourceIp: string, message: DhcpMessage) => {
    const server = message.message === "offer" || message.message === "ack";
    const packet: IPv4Packet = sealPacket({
      kind: "ipv4",
      src: sourceIp,
      dst: "255.255.255.255",
      ttl: 64,
      identification: message.transaction & 65535,
      checksum: 0,
      payload: {
        kind: "udp",
        srcPort: server ? 67 : 68,
        dstPort: server ? 68 : 67,
        checksum: 0,
        payload: message,
      },
    });
    const frame = ctx.frame(from, BROADCAST, packet);
    ctx.transmit(from, frame);
    return frame;
  };
  const request = (hostId: string) => {
    const state = ctx.state(),
      host = config.devices.find((d) => d.id === hostId)!;
    const message: DhcpMessage = {
      kind: "dhcp",
      message: "request",
      transaction: state.dhcpTransactions[hostId],
      clientMac: host.ports[0].mac!,
      clientId: hostId,
      serverId: state.dhcpSelectedServer[hostId],
      offer: state.offers[`selected:${hostId}`],
      broadcast: true,
    };
    const frame = send(
      { deviceId: hostId, portId: host.ports[0].id },
      "0.0.0.0",
      message,
    );
    ctx.emit(
      "dhcp.request",
      [hostId],
      stack,
      { kind: "explanation", subject: "request" },
      [],
      [frame],
    );
  };
  return {
    start(hostId: string, attempt = 0) {
      const state = ctx.state(),
        host = config.devices.find((d) => d.id === hostId);
      if (host?.kind !== "host" || host.addressing.mode !== "dhcp") {
        ctx.stop(issue("DHCP_NOT_SELECTED", [hostId], {}, "input"));
        return;
      }
      if (attempt === 0) {
        state.dhcpClients[hostId] = null;
        state.dhcpTransactions[hostId] = state.identifier++;
        delete state.dhcpSelectedServer[hostId];
        state.offers = {};
      }
      if (attempt >= 3) {
        ctx.stop(
          state.problem ??
            issue(
              state.dhcpSelectedServer[hostId]
                ? "DHCP_NO_ACK"
                : "DHCP_NO_SERVER",
              [hostId],
            ),
        );
        return;
      }
      ctx.retry(hostId, attempt + 1, 1000);
      if (state.dhcpSelectedServer[hostId]) {
        request(hostId);
        return;
      }
      const frame = send(
        { deviceId: hostId, portId: host.ports[0].id },
        "0.0.0.0",
        {
          kind: "dhcp",
          message: "discover",
          transaction: state.dhcpTransactions[hostId],
          clientMac: host.ports[0].mac!,
          clientId: hostId,
          serverId: null,
          offer: null,
          broadcast: true,
        },
      );
      ctx.emit(
        "dhcp.discover",
        [hostId],
        stack,
        { kind: "explanation", subject: "discover" },
        [],
        [frame],
      );
    },
    choose: request,
    receive(ingress: PortRef, frame: EthernetFrame) {
      if (frame.payload.kind !== "ipv4" || frame.payload.payload.kind !== "udp")
        return;
      const message = frame.payload.payload.payload,
        state = ctx.state(),
        device = config.devices.find((d) => d.id === ingress.deviceId);
      if (
        !device ||
        message.transaction !== state.dhcpTransactions[message.clientId]
      )
        return;
      if (device.kind === "router") {
        const port = device.ports.find((p) => p.id === ingress.portId),
          scope = device.dhcpScopes.find(
            (s) => s.enabled && s.portId === ingress.portId,
          );
        if (!port?.address || !scope) return;
        const scopeId = `${device.id}/${scope.id}`,
          key = `${scopeId}/${message.clientMac}`;
        if (message.message === "discover") {
          const first = parseIPv4(scope.first),
            last = parseIPv4(scope.last);
          if (!first.ok || !last.ok) return;
          const used = new Set(
            [...Object.values(state.dhcpLeases), ...Object.values(state.offers)]
              .filter((l) => l.clientMac !== message.clientMac)
              .map((l) => l.ip),
          );
          const existing = state.dhcpLeases[key];
          let candidate = first.value;
          while (candidate <= last.value && used.has(formatIPv4(candidate)))
            candidate++;
          const offeredIp =
            existing?.ip ??
            (candidate <= last.value ? formatIPv4(candidate) : null);
          if (!offeredIp) {
            state.problem = issue("DHCP_POOL_EXHAUSTED", [device.id]);
            ctx.emit("dhcp.noOffer", [device.id], stack, {
              kind: "failure",
              issue: state.problem,
            });
            return;
          }
          const lease: Lease = {
            ip: offeredIp,
            prefix: port.address.prefix,
            gateway: scope.gateway,
            clientMac: message.clientMac,
            scopeId,
            leaseSeconds: 4294967295,
          };
          state.offers[key] = lease;
          const outgoing = send(ingress, port.address.ip, {
            ...message,
            message: "offer",
            serverId: port.address.ip,
            offer: lease,
          });
          ctx.emit(
            "dhcp.offer",
            [device.id],
            stack,
            { kind: "explanation", subject: "offer", value: offeredIp },
            [],
            [outgoing],
          );
        } else if (message.message === "request") {
          const offer = state.offers[key];
          if (message.serverId !== port.address.ip) {
            delete state.offers[key];
            return;
          }
          if (!offer || offer.ip !== message.offer?.ip) return;
          state.dhcpLeases[key] = offer;
          delete state.offers[key];
          send(ingress, port.address.ip, {
            ...message,
            message: "ack",
            serverId: port.address.ip,
            offer,
          });
        }
        return;
      }
      if (
        device.kind !== "host" ||
        device.id !== message.clientId ||
        device.addressing.mode !== "dhcp"
      )
        return;
      if (
        message.message === "offer" &&
        message.offer &&
        message.serverId &&
        !state.dhcpSelectedServer[device.id]
      ) {
        state.dhcpSelectedServer[device.id] = message.serverId;
        state.offers[`selected:${device.id}`] = message.offer;
        ctx.choose(device.id);
      } else if (
        message.message === "ack" &&
        message.offer &&
        message.serverId === state.dhcpSelectedServer[device.id]
      ) {
        state.dhcpClients[device.id] = message.offer;
        state.result = "succeeded";
        state.problem = null;
        state.queue = [];
        state.offers = {};
        ctx.emit(
          "dhcp.ack",
          [device.id],
          stack,
          { kind: "explanation", subject: "assigned", value: message.offer.ip },
          [],
          [frame],
        );
      }
    },
  };
}
