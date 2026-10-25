export type Lease = {
  ip: string;
  prefix: number;
  gateway: string;
  clientMac: string;
  scopeId: string;
  leaseSeconds: 4294967295;
};
export type ArpMessage = {
  kind: "arp";
  opcode: "request" | "reply";
  senderIp: string;
  targetIp: string;
  senderMac: string;
  targetMac: string;
};
export type DhcpMessage = {
  kind: "dhcp";
  message: "discover" | "offer" | "request" | "ack";
  transaction: number;
  clientMac: string;
  clientId: string;
  serverId: string | null;
  offer: Lease | null;
  broadcast: true;
};
export type IcmpMessage = {
  kind: "icmp";
  type: 0 | 3 | 8 | 11;
  code: number;
  identifier: number;
  sequence: number;
  checksum: number;
  data: string;
  quote: IPv4Packet | null;
};
export type UdpMessage = {
  kind: "udp";
  srcPort: 67 | 68;
  dstPort: 67 | 68;
  checksum: number;
  payload: DhcpMessage;
};
export type IPv4Packet = {
  kind: "ipv4";
  src: string;
  dst: string;
  ttl: number;
  identification: number;
  checksum: number;
  payload: IcmpMessage | UdpMessage;
  translations?: string[];
};
export type EthernetFrame = {
  id: string;
  rootId: string;
  srcMac: string;
  dstMac: string;
  payload: ArpMessage | IPv4Packet;
};
export const BROADCAST = "ff:ff:ff:ff:ff:ff";
