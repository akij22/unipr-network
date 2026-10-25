import type {IPv4Packet,IcmpMessage} from './packets';
import {sealPacket} from './checksums';
export function makeIcmp(src:string,dst:string,type:IcmpMessage['type'],identifier:number,ttl=64,quote:IPv4Packet|null=null):IPv4Packet{return sealPacket({kind:'ipv4',src,dst,ttl,identification:identifier,checksum:0,payload:{kind:'icmp',type,code:type===3?1:0,identifier,sequence:1,checksum:0,data:'UniPRNetwork',quote}});}
