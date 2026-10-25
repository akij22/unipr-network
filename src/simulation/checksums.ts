import type { IPv4Packet, IcmpMessage, DhcpMessage } from "./packets";
export function internetChecksum(bytes: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2)
    sum += (bytes[i] << 8) + (bytes[i + 1] ?? 0);
  while (sum >>> 16) sum = (sum & 65535) + (sum >>> 16);
  return ~sum & 65535;
}
export const u16 = (n: number) => [(n >>> 8) & 255, n & 255];
const ipBytes = (ip: string) => ip.split(".").map(Number);
export function encodeIcmp(message: IcmpMessage): Uint8Array {
  const tail = message.quote
    ? [
        ...encodeIPv4Header(message.quote),
        ...encodeTransport(message.quote).slice(0, 8),
      ]
    : Array.from(message.data).map((c) => c.charCodeAt(0) & 255);
  return new Uint8Array([
    message.type,
    message.code,
    ...u16(message.checksum),
    ...(message.quote
      ? [0, 0, 0, 0]
      : [...u16(message.identifier), ...u16(message.sequence)]),
    ...tail,
  ]);
}
export function encodeDhcp(message: DhcpMessage): Uint8Array {
  const bytes = new Uint8Array(240),
    view = new DataView(bytes.buffer);
  bytes[0] = message.message === "offer" || message.message === "ack" ? 2 : 1;
  bytes[1] = 1;
  bytes[2] = 6;
  view.setUint32(4, message.transaction);
  view.setUint16(10, 0x8000);
  if (
    message.offer &&
    (message.message === "offer" || message.message === "ack")
  )
    bytes.set(ipBytes(message.offer.ip), 16);
  if (message.serverId) bytes.set(ipBytes(message.serverId), 20);
  bytes.set(
    message.clientMac.split(":").map((s) => parseInt(s, 16)),
    28,
  );
  bytes.set([99, 130, 83, 99], 236);
  const options = [
    53,
    1,
    { discover: 1, offer: 2, request: 3, ack: 5 }[message.message],
  ];
  if (message.serverId) options.push(54, 4, ...ipBytes(message.serverId));
  if (message.message === "request" && message.offer)
    options.push(50, 4, ...ipBytes(message.offer.ip));
  if (
    message.offer &&
    (message.message === "offer" || message.message === "ack")
  ) {
    const mask =
      message.offer.prefix === 0
        ? 0
        : (0xffffffff << (32 - message.offer.prefix)) >>> 0;
    options.push(
      1,
      4,
      mask >>> 24,
      (mask >>> 16) & 255,
      (mask >>> 8) & 255,
      mask & 255,
      3,
      4,
      ...ipBytes(message.offer.gateway),
      51,
      4,
      255,
      255,
      255,
      255,
    );
  }
  options.push(255);
  return new Uint8Array([...bytes, ...options]);
}
export function encodeTransport(packet: IPv4Packet): Uint8Array {
  if (packet.payload.kind === "icmp") return encodeIcmp(packet.payload);
  const p = packet.payload,
    payload = encodeDhcp(p.payload);
  return new Uint8Array([
    ...u16(p.srcPort),
    ...u16(p.dstPort),
    ...u16(8 + payload.length),
    ...u16(p.checksum),
    ...payload,
  ]);
}
export function encodeIPv4Header(packet: IPv4Packet): Uint8Array {
  return new Uint8Array([
    0x45,
    0,
    ...u16(20 + encodeTransport(packet).length),
    ...u16(packet.identification),
    0,
    0,
    packet.ttl,
    packet.payload.kind === "icmp" ? 1 : 17,
    ...u16(packet.checksum),
    ...ipBytes(packet.src),
    ...ipBytes(packet.dst),
  ]);
}
export function sealPacket(packet: IPv4Packet): IPv4Packet {
  const next = { ...packet, payload: { ...packet.payload }, checksum: 0 };
  if (next.payload.kind === "icmp") {
    next.payload.checksum = 0;
    next.payload.checksum = internetChecksum(encodeIcmp(next.payload));
  }
  next.checksum = internetChecksum(encodeIPv4Header(next));
  return next;
}
