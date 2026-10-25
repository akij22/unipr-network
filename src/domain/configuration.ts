import {issue,type NetworkConfig,type Issue} from './types';
import {analyzePrefix,parseIPv4} from './ipv4';
import {portKey} from './topology';
export function validateConfiguration(config:NetworkConfig):Issue[]{
 const errors:Issue[]=[],ids=new Set<string>(),macs=new Set<string>(),occupied=new Set<string>();
 for(const device of config.devices){
  if(ids.has(device.id)) errors.push(issue('DUPLICATE_ID',[device.id],{},'input')); ids.add(device.id);
  if(device.kind==='host'&&device.ports.length!==1||device.kind==='bridge'&&device.ports.length!==2) errors.push(issue('PORT_COUNT',[device.id],{},'input'));
  const portIds=new Set<string>();
  for(const port of device.ports){
   if(portIds.has(port.id)) errors.push(issue('DUPLICATE_PORT',[device.id],{},'input'));portIds.add(port.id);
   if(port.mac){if(!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(port.mac)||macs.has(port.mac.toLowerCase())) errors.push(issue('INVALID_MAC',[device.id],{},'input'));macs.add(port.mac.toLowerCase());}
   else if(device.kind==='host'||device.kind==='router') errors.push(issue('INVALID_MAC',[device.id],{},'input'));
   if(port.address&&!analyzePrefix(port.address.ip,port.address.prefix).ok)errors.push(issue('INVALID_IPV4',[device.id],{},'input'));
  }
  if(device.kind==='host'&&device.addressing.mode==='manual'&&device.addressing.gateway&&!parseIPv4(device.addressing.gateway).ok)errors.push(issue('INVALID_GATEWAY',[device.id],{},'input'));
  if(device.kind==='router')for(const route of device.routes)if(!analyzePrefix(route.destination.ip,route.destination.prefix).ok||route.nextHop&&!parseIPv4(route.nextHop).ok||!device.ports.some(p=>p.id===route.outPortId))errors.push(issue('INVALID_ROUTE',[device.id],{},'input'));
 }
 for(const link of config.links)for(const ref of link.ends){
  if(!config.devices.find(d=>d.id===ref.deviceId)?.ports.some(p=>p.id===ref.portId)||occupied.has(portKey(ref)))errors.push(issue('INVALID_LINK',[ref.deviceId],{},'input',[link.id]));occupied.add(portKey(ref));
 }
 return errors;
}
