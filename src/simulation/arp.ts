import type {NetworkConfig,PortRef} from '../domain/types';
import {portKey} from '../domain/topology';
export function l2Endpoints(config:NetworkConfig,start:PortRef):PortRef[]{
 const endpoints:PortRef[]=[],pending=[start],seen=new Set<string>(),devices=new Map(config.devices.map(d=>[d.id,d]));
 while(pending.length){const ref=pending.pop()!;if(seen.has(portKey(ref)))continue;seen.add(portKey(ref));const d=devices.get(ref.deviceId);if(!d)continue;
  if(d.kind==='host'||d.kind==='router')endpoints.push(ref);else for(const p of d.ports)if(p.id!==ref.portId)pending.push({deviceId:d.id,portId:p.id});
  for(const link of config.links){const i=link.ends.findIndex(end=>portKey(end)===portKey(ref));if(i>=0)pending.push(link.ends[1-i]);}
 }return endpoints;
}
export const arpKey=(ref:PortRef,ip:string)=>`${ref.deviceId}/${ref.portId}/${ip}`;
