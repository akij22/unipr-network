import type {Issue,PortRef,Result} from '../domain/types';
import type {EthernetFrame,IPv4Packet,Lease} from './packets';
export type Operation={kind:'ping';sourceId:string;destination:string;ttl?:number;identifier?:number}|{kind:'dhcp';hostId:string};
export type ProtocolId='ethernet'|'arp'|'ipv4'|'icmp'|'udp'|'dhcp'|'nat';
export type NatBinding={id:string;insideIp:string;insideIdentifier:number;outsideIp:string;outsideIdentifier:number;remoteIp:string};
export type ScheduledAction={id:string;at:number;sequence:number;causeId:string|null}&(
 {type:'tick'}|{type:'start';operation:Operation}|{type:'transmit';from:PortRef;frame:EthernetFrame}|{type:'deliver';ingress:PortRef;frame:EthernetFrame}|
 {type:'resolve';from:PortRef;nextHop:string;packet:IPv4Packet;attempt:number}|{type:'dhcpRetry';hostId:string;attempt:number}|{type:'dhcpChoose';hostId:string});
export type NetworkState={clock:number;sequence:number;packetSequence:number;eventSequence:number;identifier:number;queue:ScheduledAction[];arp:Record<string,string>;mac:Record<string,string>;dhcpClients:Record<string,Lease|null>;dhcpLeases:Record<string,Lease>;offers:Record<string,Lease>;nat:Record<string,NatBinding[]>;operation:Operation|null;result:'running'|'succeeded'|'failed'|null;problem:Issue|null};
type EntryChange<T extends 'arp'|'mac'|'dhcpClients'|'dhcpLeases'|'offers'|'nat'>={table:T;key:string;before:NetworkState[T][string]|null;after:NetworkState[T][string]|null};
type ScalarChange<T extends keyof NetworkState>={table:T;before:NetworkState[T];after:NetworkState[T]};
export type StateChange=EntryChange<'arp'>|EntryChange<'mac'>|EntryChange<'dhcpClients'>|EntryChange<'dhcpLeases'>|EntryChange<'offers'>|EntryChange<'nat'>|{[K in Exclude<keyof NetworkState,'arp'|'mac'|'dhcpClients'|'dhcpLeases'|'offers'|'nat'>]:ScalarChange<K>}[Exclude<keyof NetworkState,'arp'|'mac'|'dhcpClients'|'dhcpLeases'|'offers'|'nat'>];
export type EventDetail={kind:'explanation';subject:string;value?:string}|{kind:'route';routeId:string;outPortId:string;nextHop:string}|{kind:'translation';direction:'outbound'|'inbound';bindingId:string}|{kind:'failure';issue:Issue};
export type EventKind='operation.started'|'ethernet.forwarded'|'ethernet.flooded'|'arp.request'|'arp.reply'|'arp.cached'|'route.selected'|'ipv4.forwarded'|'icmp.echoReply'|'icmp.timeExceeded'|'icmp.unreachable'|'dhcp.discover'|'dhcp.offer'|'dhcp.request'|'dhcp.ack'|'nat.translated'|'operation.completed'|'operation.failed';
export type SimEvent={id:string;index:number;time:number;causeId:string|null;kind:EventKind;protocols:ProtocolId[];deviceIds:string[];linkIds:string[];before:EthernetFrame[];after:EthernetFrame[];changes:StateChange[];detail:EventDetail};
export type AdvanceResult={kind:'yield'}|{kind:'event';event:SimEvent;state:NetworkState}|{kind:'done';state:NetworkState};
export interface Simulator{start(operation:Operation,operationId:string):Result<void>;advance(maxActions:number):AdvanceResult;snapshot():NetworkState;cancel():NetworkState;reset():NetworkState}
