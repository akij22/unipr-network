import {
  fail,
  issue,
  ok,
  type NetworkConfig,
  type PortRef,
  type Issue,
} from "../domain/types";
import { validateConfiguration } from "../domain/configuration";
import { findL2Cycles } from "../domain/l2-cycles";
import { parseIPv4 } from "../domain/ipv4";
import { contains } from "../domain/ipv4";
import { portKey } from "../domain/topology";
import { copy, createInitialState, diffState, applyChanges } from "./state";
import { forwardEthernet } from "./ethernet";
import { addressOf, selectRoute } from "./ipv4";
import { arpKey, l2Endpoints } from "./arp";
import { makeIcmp } from "./icmp";
import { createDhcpProtocol } from "./dhcp";
import { translateOutbound, translateInbound } from "./nat";
import { sealPacket } from "./checksums";
import { BROADCAST, type EthernetFrame, type IPv4Packet } from "./packets";
import type {
  Simulator,
  NetworkState,
  ScheduledAction,
  SimEvent,
  EventKind,
  EventDetail,
  ProtocolId,
  Operation,
  AdvanceResult,
} from "./types";
type ActionBody = ScheduledAction extends infer A
  ? A extends ScheduledAction
    ? Omit<A, "id" | "at" | "sequence" | "causeId">
    : never
  : never;
export function createSimulator(config: NetworkConfig): Simulator {
  let state = createInitialState(config),
    initial = copy(state),
    observed = copy(state),
    operationId = "",
    current: ScheduledAction | null = null,
    produced: SimEvent | null = null;
  const devices = new Map(config.devices.map((d) => [d.id, d]));
  const enqueue = (body: ActionBody, delay = 1) => {
    const n = ++state.sequence;
    state.queue.push({
      ...body,
      id: `a${n}`,
      at: state.clock + delay,
      sequence: n,
      causeId: current?.id ?? null,
    } as ScheduledAction);
    state.queue.sort((a, b) => a.at - b.at || a.sequence - b.sequence);
  };
  const emit = (
    kind: EventKind,
    deviceIds: string[],
    protocols: ProtocolId[],
    detail: EventDetail = { kind: "explanation", subject: kind },
    before: EthernetFrame[] = [],
    after: EthernetFrame[] = [],
    linkIds: string[] = [],
  ) => {
    state.eventSequence++;
    produced = {
      id: `${operationId}:${state.eventSequence}`,
      index: state.eventSequence,
      time: state.clock,
      causeId: current?.causeId ?? null,
      kind,
      deviceIds,
      protocols,
      detail,
      before: copy(before),
      after: copy(after),
      linkIds,
      changes: [],
    };
  };
  const stop = (problem: Issue) => {
    state.problem = problem;
    state.result = "failed";
    state.queue = [];
    if (state.operation?.kind === "dhcp") state.offers = {};
  };
  const frame = (
    from: PortRef,
    dstMac: string,
    payload: EthernetFrame["payload"],
    rootId?: string,
  ): EthernetFrame => {
    const id = `f${++state.packetSequence}`;
    return {
      id,
      rootId: rootId ?? id,
      srcMac: devices
        .get(from.deviceId)!
        .ports.find((p) => p.id === from.portId)!.mac!,
      dstMac,
      payload: copy(payload),
    };
  };
  const endpoint = (ref: PortRef) => {
    const d = devices.get(ref.deviceId),
      p = d?.ports.find((p) => p.id === ref.portId);
    return d && p
      ? { device: d, port: p, address: addressOf(d, p, state) }
      : null;
  };
  const duplicate = (ref: PortRef, ip: string) =>
    l2Endpoints(config, ref).filter((r) => endpoint(r)?.address?.ip === ip)
      .length > 1;
  const errorPacket = (
    deviceId: string,
    packet: IPv4Packet,
    type: 3 | 11,
    problem: Issue,
  ) => {
    state.problem = problem;
    const d = devices.get(deviceId)!;
    const source = d.ports.map((p) => addressOf(d, p, state)).find(Boolean);
    if (
      d.kind !== "router" ||
      !source ||
      d.ports.some((p) => addressOf(d, p, state)?.ip === packet.src) ||
      packet.payload.kind !== "icmp" ||
      packet.payload.type === 3 ||
      packet.payload.type === 11
    ) {
      stop(problem);
      return;
    }
    const error = makeIcmp(
      source.ip,
      packet.src,
      type,
      packet.payload.identifier,
      64,
      copy(packet),
    );
    enqueue({ type: "route", deviceId, packet: error, received: false });
    emit(
      type === 11 ? "icmp.timeExceeded" : "icmp.unreachable",
      [deviceId],
      ["ipv4", "icmp"],
      { kind: "failure", issue: problem },
    );
  };
  const routePacket = (
    deviceId: string,
    packet: IPv4Packet,
    received: boolean,
    originalFrame?: EthernetFrame,
    ingress?: PortRef,
  ) => {
    const d = devices.get(deviceId)!;
    if (received && packet.ttl <= 1) {
      errorPacket(deviceId, packet, 11, issue("TTL_EXCEEDED", [deviceId]));
      return;
    }
    const route = selectRoute(config, deviceId, packet.dst, state);
    if (!route.ok) {
      if (d.kind === "router" && received)
        errorPacket(deviceId, packet, 3, route.issue);
      else stop(route.issue);
      return;
    }
    const routed = sealPacket({
      ...packet,
      ttl: received ? packet.ttl - 1 : packet.ttl,
    });
    const from = { deviceId, portId: route.value.outPortId };
    if (
      d.kind === "router" &&
      d.nat?.enabled &&
      received &&
      ingress &&
      d.nat.insidePortIds.includes(ingress.portId) &&
      d.nat.outsidePortId === from.portId &&
      d.nat.sourceNetworks.some((n) => contains(n, packet.src)) &&
      originalFrame
    )
      enqueue({
        type: "translate",
        from,
        nextHop: route.value.nextHop,
        packet: routed,
        originalFrame,
      });
    else
      enqueue({
        type: "resolve",
        from,
        nextHop: route.value.nextHop,
        packet: routed,
        attempt: 0,
        previousFrame: originalFrame,
      });
    emit(
      "route.selected",
      [deviceId],
      ["ipv4"],
      { kind: "route", ...route.value },
      originalFrame ? [originalFrame] : [],
      originalFrame ? [{ ...originalFrame, payload: routed }] : [],
    );
  };
  const dhcp = createDhcpProtocol(config, {
    state: () => state,
    frame,
    emit,
    stop,
    transmit: (from, frame) => enqueue({ type: "transmit", from, frame }),
    retry: (hostId, attempt, delay) =>
      enqueue({ type: "dhcpRetry", hostId, attempt }, delay),
    choose: (hostId) => enqueue({ type: "dhcpChoose", hostId }),
  });
  const process = (action: ScheduledAction) => {
    switch (action.type) {
      case "tick":
        return;
      case "start": {
        const op = action.operation;
        if (op.kind === "dhcp") {
          dhcp.start(op.hostId);
          return;
        }
        const d = devices.get(op.sourceId),
          p = d?.ports[0],
          a = d && p ? addressOf(d, p, state) : null;
        if (!d || !p || !a) {
          stop(issue("NO_ADDRESS", [op.sourceId]));
          return;
        }
        if (duplicate({ deviceId: d.id, portId: p.id }, a.ip)) {
          stop(issue("DUPLICATE_IPV4", [d.id], { ip: a.ip }));
          return;
        }
        const packet = makeIcmp(
          a.ip,
          op.destination,
          8,
          op.identifier ?? state.identifier++,
          op.ttl ?? 64,
        );
        state.operation = {
          ...op,
          identifier: op.identifier ?? state.identifier - 1,
        };
        if (
          d.ports.some(
            (port) => addressOf(d, port, state)?.ip === op.destination,
          )
        ) {
          state.result = "succeeded";
          emit("icmp.echoReply", [d.id], ["ipv4", "icmp"]);
          return;
        }
        enqueue({ type: "route", deviceId: d.id, packet, received: false });
        emit("operation.started", [d.id], ["icmp", "ipv4"]);
        return;
      }
      case "route":
        routePacket(
          action.deviceId,
          action.packet,
          action.received,
          action.originalFrame,
          action.ingress,
        );
        return;
      case "translate": {
        const d = devices.get(action.from.deviceId)!;
        const translated = translateOutbound(d, state, action.packet);
        if (!translated.ok) {
          stop(translated.issue);
          return;
        }
        state = applyChanges(state, translated.value.changes);
        const before = { ...action.originalFrame, payload: action.packet },
          after = { ...before, payload: translated.value.packet };
        enqueue({
          type: "resolve",
          from: action.from,
          nextHop: action.nextHop,
          packet: translated.value.packet,
          attempt: 0,
          previousFrame: action.originalFrame,
        });
        emit(
          "nat.translated",
          [d.id],
          ["ipv4", "icmp", "nat"],
          {
            kind: "translation",
            direction: "outbound",
            bindingId: translated.value.binding.id,
          },
          [before],
          [after],
        );
        return;
      }
      case "resolve": {
        const { from, nextHop, packet, attempt } = action,
          ep = endpoint(from);
        if (!ep?.address) {
          stop(issue("NO_ADDRESS", [from.deviceId]));
          return;
        }
        if (duplicate(from, nextHop)) {
          stop(issue("DUPLICATE_IPV4", [from.deviceId], { ip: nextHop }));
          return;
        }
        const mac = state.arp[arpKey(from, nextHop)];
        if (mac) {
          const outgoing = frame(from, mac, packet);
          enqueue({ type: "transmit", from, frame: outgoing });
          emit(
            "ipv4.forwarded",
            [from.deviceId],
            [
              "ethernet",
              "ipv4",
              ...(packet.payload.kind === "icmp" ? ["icmp" as const] : []),
            ],
            { kind: "explanation", subject: "nextHop", value: nextHop },
            action.previousFrame ? [action.previousFrame] : [],
            [outgoing],
          );
          return;
        }
        if (attempt >= 3) {
          const problem = issue("ARP_NO_REPLY", [from.deviceId], {
            ip: nextHop,
          });
          errorPacket(from.deviceId, packet, 3, problem);
          return;
        }
        const request = frame(from, BROADCAST, {
          kind: "arp",
          opcode: "request",
          senderIp: ep.address.ip,
          targetIp: nextHop,
          senderMac: ep.port.mac!,
          targetMac: "00:00:00:00:00:00",
        });
        enqueue({ type: "transmit", from, frame: request });
        enqueue({ ...action, type: "resolve", attempt: attempt + 1 }, 1000);
        emit(
          "arp.request",
          [from.deviceId],
          ["ethernet", "arp"],
          { kind: "explanation", subject: "targetIp", value: nextHop },
          [],
          [request],
        );
        return;
      }
      case "transmit": {
        const connected = config.links.find((l) =>
          l.ends.some((e) => portKey(e) === portKey(action.from)),
        );
        if (!connected) return;
        const other = connected.ends.find(
          (e) => portKey(e) !== portKey(action.from),
        )!;
        const sent = { ...action.frame, id: `f${++state.packetSequence}` };
        enqueue({ type: "deliver", ingress: other, frame: sent });
        emit(
          "ethernet.forwarded",
          [action.from.deviceId, other.deviceId],
          ["ethernet"],
          { kind: "explanation", subject: "link" },
          [],
          [sent],
          [connected.id],
        );
        return;
      }
      case "deliver": {
        const ep = endpoint(action.ingress);
        if (!ep) return;
        const { device, port, address } = ep,
          f = action.frame;
        if (["switch", "hub", "bridge"].includes(device.kind)) {
          const result = forwardEthernet(config, state, action.ingress, f);
          state = applyChanges(state, result.changes);
          for (const out of result.egress)
            enqueue({
              type: "transmit",
              from: out,
              frame: { ...f, id: `f${++state.packetSequence}` },
            });
          emit(
            result.egress.length > 1
              ? "ethernet.flooded"
              : "ethernet.forwarded",
            [device.id],
            ["ethernet"],
            { kind: "explanation", subject: device.kind },
            [f],
            [f],
          );
          return;
        }
        if (f.dstMac !== BROADCAST && f.dstMac !== port.mac) return;
        if (f.payload.kind === "arp") {
          const arp = f.payload;
          if (
            arp.senderIp !== "0.0.0.0" &&
            (arp.targetIp === address?.ip ||
              state.arp[arpKey(action.ingress, arp.senderIp)])
          )
            state.arp[arpKey(action.ingress, arp.senderIp)] = arp.senderMac;
          if (arp.opcode === "request" && arp.targetIp === address?.ip) {
            const reply = frame(action.ingress, arp.senderMac, {
              kind: "arp",
              opcode: "reply",
              senderIp: address.ip,
              targetIp: arp.senderIp,
              senderMac: port.mac!,
              targetMac: arp.senderMac,
            });
            enqueue({ type: "transmit", from: action.ingress, frame: reply });
            emit(
              "arp.reply",
              [device.id],
              ["ethernet", "arp"],
              { kind: "explanation", subject: "resolved", value: address.ip },
              [f],
              [reply],
            );
          } else if (arp.opcode === "reply" && arp.targetIp === address?.ip) {
            for (const pending of state.queue)
              if (
                pending.type === "resolve" &&
                portKey(pending.from) === portKey(action.ingress) &&
                pending.nextHop === arp.senderIp
              )
                pending.at = state.clock + 1;
            state.queue.sort((a, b) => a.at - b.at || a.sequence - b.sequence);
            emit(
              "arp.cached",
              [device.id],
              ["ethernet", "arp"],
              { kind: "explanation", subject: "cached", value: arp.senderIp },
              [f],
              [f],
            );
          }
          return;
        }
        const packet = f.payload;
        if (packet.payload.kind === "udp") {
          dhcp.receive(action.ingress, f);
          return;
        }
        if (
          device.kind === "router" &&
          device.nat?.enabled &&
          device.nat.outsidePortId === port.id &&
          packet.dst === address?.ip &&
          packet.payload.kind === "icmp" &&
          [0, 3, 11].includes(packet.payload.type) &&
          !(
            state.operation?.kind === "ping" &&
            state.operation.sourceId === device.id
          )
        ) {
          const translated = translateInbound(device, state, packet);
          if (!translated.ok) {
            stop(translated.issue);
            return;
          }
          enqueue({
            type: "route",
            deviceId: device.id,
            packet: translated.value.packet,
            received: true,
            originalFrame: { ...f, payload: translated.value.packet },
            ingress: action.ingress,
          });
          emit(
            "nat.translated",
            [device.id],
            ["ipv4", "icmp", "nat"],
            {
              kind: "translation",
              direction: "inbound",
              bindingId: translated.value.binding.id,
            },
            [f],
            [{ ...f, payload: translated.value.packet }],
          );
          return;
        }
        if (
          device.ports.some(
            (p) => addressOf(device, p, state)?.ip === packet.dst,
          )
        ) {
          if (packet.payload.kind !== "icmp") return;
          if (packet.payload.type === 8) {
            const reply = makeIcmp(
              packet.dst,
              packet.src,
              0,
              packet.payload.identifier,
            );
            enqueue({
              type: "route",
              deviceId: device.id,
              packet: reply,
              received: false,
            });
            emit(
              "icmp.echoReply",
              [device.id],
              ["ipv4", "icmp"],
              { kind: "explanation", subject: "reply" },
              [f],
              [{ ...f, payload: reply }],
            );
          } else if (packet.payload.type === 0) {
            const operation = state.operation;
            if (
              operation?.kind !== "ping" ||
              operation.sourceId !== device.id ||
              packet.src !== operation.destination ||
              packet.payload.identifier !== operation.identifier ||
              packet.payload.sequence !== 1
            )
              return;
            state.result = "succeeded";
            state.queue = [];
            emit(
              "icmp.echoReply",
              [device.id],
              ["ipv4", "icmp"],
              { kind: "explanation", subject: "received" },
              [f],
              [f],
            );
          } else {
            stop(
              state.problem ??
                issue(
                  packet.payload.type === 11
                    ? "TTL_EXCEEDED"
                    : "DESTINATION_UNREACHABLE",
                  [device.id],
                ),
            );
          }
          return;
        }
        if (device.kind === "router")
          enqueue({
            type: "route",
            deviceId: device.id,
            packet,
            received: true,
            originalFrame: f,
            ingress: action.ingress,
          });
        return;
      }
      case "dhcpRetry":
        dhcp.start(action.hostId, action.attempt);
        return;
      case "dhcpChoose":
        dhcp.choose(action.hostId);
        return;
    }
  };
  return {
    start(operation, id) {
      if (state.operation)
        return fail(issue("OPERATION_ACTIVE", [], {}, "input"));
      const invalid = validateConfiguration(config)[0];
      if (invalid) return fail(invalid);
      const cycles = findL2Cycles(config);
      if (cycles.length)
        return fail(issue("L2_LOOP", [], {}, "model", cycles.flat()));
      if (
        operation.kind === "ping" &&
        (!parseIPv4(operation.destination).ok ||
          (operation.ttl !== undefined &&
            (!Number.isInteger(operation.ttl) ||
              operation.ttl < 1 ||
              operation.ttl > 255)))
      )
        return fail(issue("INVALID_PING", [], {}, "input"));
      initial = copy(state);
      operationId = id;
      state = {
        ...copy(state),
        operation: copy(operation),
        result: "running",
        problem: null,
        eventSequence: 0,
        queue: [],
      };
      enqueue({ type: "start", operation }, 0);
      observed = copy(state);
      return ok(undefined);
    },
    advance(maxActions): AdvanceResult {
      for (let n = 0; n < Math.max(1, maxActions); n++) {
        produced = null;
        current = state.queue.shift() ?? null;
        if (current) {
          state.clock = current.at;
          process(current);
        } else if (state.operation) {
          const source =
            state.operation.kind === "ping"
              ? state.operation.sourceId
              : state.operation.hostId;
          if (state.result !== "succeeded") {
            state.result = "failed";
            state.problem ??= issue("NO_REPLY", [source]);
          }
          state.operation = null;
          emit(
            state.result === "succeeded"
              ? "operation.completed"
              : "operation.failed",
            [source],
            [],
            state.problem
              ? { kind: "failure", issue: state.problem }
              : { kind: "explanation", subject: "complete" },
          );
        } else return { kind: "done", state: copy(state) };
        if (produced) {
          const event = produced as SimEvent;
          event.changes = diffState(observed, state);
          observed = copy(state);
          return { kind: "event", event, state: copy(state) };
        }
      }
      return { kind: "yield" };
    },
    snapshot: () => copy(state),
    cancel() {
      state = copy(initial);
      observed = copy(state);
      return copy(state);
    },
    reset() {
      state = createInitialState(config);
      initial = copy(state);
      observed = copy(state);
      return copy(state);
    },
  };
}
