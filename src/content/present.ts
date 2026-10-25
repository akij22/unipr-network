import type {SimEvent} from '../simulation/types';
import type {NetworkDocument} from '../app/types';
import {eventTitles} from './events.en';
import {presentIssue} from './issues.en';
export function presentEvent(event:SimEvent,document:NetworkDocument){
 const name=document.layout[event.deviceIds[0]]?.name??event.deviceIds[0]??'The network',detail=event.detail;
 let summary='';
 if(detail.kind==='failure')summary=presentIssue(detail.issue,document);
 else if(detail.kind==='route')summary=`${name} selects ${detail.outPortId} and the next hop ${detail.nextHop}. The most specific matching network determines the outgoing interface.`;
 else if(detail.kind==='translation')summary=`${name} uses a ${detail.direction==='outbound'?'new or existing':'matching return'} translation. Compare the IPv4 addresses and ICMP identifiers before and after the router.`;
 else{const descriptions:Partial<Record<SimEvent['kind'],string>>={
 'operation.started':`${name} prepares one ping. The route and next-hop MAC address will be determined from the current network state.`,
 'ethernet.forwarded':`${name} sends the frame on the highlighted Ethernet connection. The destination MAC identifies the next device on this link.`,
 'ethernet.flooded':`${name} forwards copies to the other ports because this frame is a broadcast or its destination is not yet known. Each transmitted copy can be inspected in the following events.`,
 'arp.request':`${name} broadcasts an ARP request for ${detail.value??'the next hop'}. It needs a MAC address before it can send the IPv4 packet on this link.`,
 'arp.reply':`${name} answers the ARP request with its interface MAC address.`,
 'arp.cached':`${name} remembers the IPv4-to-MAC mapping for ${detail.value??'the sender'}. Later packets can use this entry without repeating the request.`,
 'ipv4.forwarded':`${name} uses a known next-hop MAC address to build the Ethernet frame. The IPv4 destination identifies the final endpoint; the MAC destination identifies the next hop.`,
 'icmp.echoReply':detail.subject==='received'?`${name} receives the Echo Reply. The destination was reachable and a return path worked.`:`${name} recognizes an Echo Request addressed to itself and prepares an Echo Reply.`,
 'dhcp.discover':`${name} broadcasts a DHCP Discover from 0.0.0.0 because it does not have an IPv4 configuration yet.`,
 'dhcp.offer':`${name} offers an available address, prefix and gateway. This is an offer, not yet an assigned address.`,
 'dhcp.request':`${name} broadcasts a DHCP Request naming the selected server and address. Other servers can release their offers.`,
 'dhcp.ack':`${name} confirms the assignment. The host can now use its address and gateway. This lab uses leases without expiration.`,
 'operation.completed':'The operation finished successfully. Learned addresses and translations remain available until you reset or change the network.',
 'operation.failed':'The operation could not finish. Inspect the last event to find the device and network condition that stopped it.'};summary=descriptions[event.kind]??`${name} processes this network message.`;}
 return{title:eventTitles[event.kind],summary,protocolIds:event.protocols,detailRows:[['Virtual time',`${event.time} ms`],['Event',String(event.index)],['Cause',event.causeId??'User action']]};
}
export {presentIssue} from './issues.en';
