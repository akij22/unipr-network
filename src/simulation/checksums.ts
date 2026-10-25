import type {IPv4Packet,IcmpMessage} from './packets';
export function internetChecksum(bytes:Uint8Array):number{let sum=0;for(let i=0;i<bytes.length;i+=2)sum+=(bytes[i]<<8)+(bytes[i+1]??0);while(sum>>>16)sum=(sum&65535)+(sum>>>16);return(~sum)&65535;}
export const u16=(n:number)=>[n>>>8&255,n&255];
const ipBytes=(ip:string)=>ip.split('.').map(Number);
export function encodeIcmp(message:IcmpMessage):Uint8Array{
 const tail=message.quote?[...encodeIPv4Header(message.quote),...encodeTransport(message.quote).slice(0,8)]:Array.from(message.data).map(c=>c.charCodeAt(0)&255);
 return new Uint8Array([message.type,message.code,...u16(message.checksum),...(message.quote?[0,0,0,0]:[...u16(message.identifier),...u16(message.sequence)]),...tail]);
}
export function encodeTransport(packet:IPv4Packet):Uint8Array{return packet.payload.kind==='icmp'?encodeIcmp(packet.payload):new Uint8Array(8);}
export function encodeIPv4Header(packet:IPv4Packet):Uint8Array{return new Uint8Array([0x45,0,...u16(20+encodeTransport(packet).length),...u16(packet.identification),0,0,packet.ttl,packet.payload.kind==='icmp'?1:17,...u16(packet.checksum),...ipBytes(packet.src),...ipBytes(packet.dst)]);}
export function sealPacket(packet:IPv4Packet):IPv4Packet{
 const next={...packet,payload:{...packet.payload},checksum:0};
 if(next.payload.kind==='icmp'){next.payload.checksum=0;next.payload.checksum=internetChecksum(encodeIcmp(next.payload));}
 next.checksum=internetChecksum(encodeIPv4Header(next));return next;
}
