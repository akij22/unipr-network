import {fail,issue,ok,type NetworkConfig,type PortRef,type Result} from './types';
export const portKey=(ref:PortRef)=>`${ref.deviceId}/${ref.portId}`;
export function connectPorts(config:NetworkConfig,from:PortRef,to:PortRef,id:string):Result<NetworkConfig>{
 if(from.deviceId===to.deviceId) return fail(issue('SELF_CONNECTION',[from.deviceId],{},'input'));
 for(const ref of [from,to]) {
  if(!config.devices.find(d=>d.id===ref.deviceId)?.ports.some(p=>p.id===ref.portId)) return fail(issue('PORT_NOT_FOUND',[ref.deviceId],{},'input'));
  if(config.links.some(l=>l.ends.some(end=>portKey(end)===portKey(ref)))) return fail(issue('PORT_OCCUPIED',[ref.deviceId],{},'input'));
 }
 if(config.links.some(l=>l.id===id)) return fail(issue('DUPLICATE_ID',[],{},'input'));
 return ok({...config,links:[...config.links,{id,ends:[from,to]}]});
}
