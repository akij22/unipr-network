import {fail,issue,ok,type Device,type Result} from '../domain/types';
import type {IPv4Packet} from './packets';
import type {NetworkState,NatBinding,StateChange} from './types';
import {sealPacket} from './checksums';
type Translation={packet:IPv4Packet;binding:NatBinding;changes:StateChange[]};
export function translateOutbound(device:Device,state:NetworkState,packet:IPv4Packet):Result<Translation>{
 if(device.kind!=='router'||!device.nat?.enabled||packet.payload.kind!=='icmp')return fail(issue('NAT_NOT_CONFIGURED',[device.id],{},'model'));
 if(packet.translations?.length)return fail(issue('NESTED_NAT_UNSUPPORTED',[device.id],{},'model'));
 const outside=device.ports.find(p=>p.id===device.nat!.outsidePortId)?.address?.ip;if(!outside)return fail(issue('INVALID_NAT_CONFIG',[device.id],{},'input'));
 const entries=state.nat[device.id]??[];
 let binding=entries.find(b=>b.insideIp===packet.src&&b.insideIdentifier===(packet.payload.kind==='icmp'?packet.payload.identifier:-1)&&b.remoteIp===packet.dst),changes:StateChange[]=[];
 if(!binding){const used=new Set(entries.map(b=>b.outsideIdentifier));let id=1;while(used.has(id)&&id<=65535)id++;if(id>65535)return fail(issue('NAT_IDENTIFIERS_EXHAUSTED',[device.id],{},'resource'));binding={id:`${device.id}:${id}`,insideIp:packet.src,insideIdentifier:packet.payload.identifier,outsideIp:outside,outsideIdentifier:id,remoteIp:packet.dst};changes=[{table:'nat',key:device.id,before:entries,after:[...entries,binding]}];}
 return ok({packet:sealPacket({...packet,src:outside,payload:{...packet.payload,identifier:binding.outsideIdentifier},translations:[device.id]}),binding,changes});
}
export function translateInbound(device:Device,state:NetworkState,packet:IPv4Packet):Result<Translation>{
 if(device.kind!=='router'||!device.nat?.enabled||packet.payload.kind!=='icmp')return fail(issue('NAT_NOT_CONFIGURED',[device.id],{},'model'));
 const message=packet.payload,quote=message.quote;
 const identifier=quote?.payload.kind==='icmp'?quote.payload.identifier:message.identifier;
 const remote=quote?quote.dst:packet.src;
 const binding=(state.nat[device.id]??[]).find(b=>b.outsideIp===packet.dst&&b.outsideIdentifier===identifier&&b.remoteIp===remote&&(!quote||quote.src===b.outsideIp));
 if(!binding)return fail(issue('NAT_NO_BINDING',[device.id]));
 const restoredQuote=quote&&quote.payload.kind==='icmp'?sealPacket({...quote,src:binding.insideIp,payload:{...quote.payload,identifier:binding.insideIdentifier}}):quote;
 return ok({packet:sealPacket({...packet,dst:binding.insideIp,payload:{...message,identifier:quote?message.identifier:binding.insideIdentifier,quote:restoredQuote}}),binding,changes:[]});
}
