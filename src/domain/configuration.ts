import {issue,type NetworkConfig,type Issue} from './types';
import {analyzePrefix,parseIPv4,contains} from './ipv4';
import {portKey,connectedEndpoints} from './topology';
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
  if(device.kind==='router')for(const scope of device.dhcpScopes.filter(s=>s.enabled)){
   const port=device.ports.find(p=>p.id===scope.portId),address=port?.address,first=parseIPv4(scope.first),last=parseIPv4(scope.last),gateway=parseIPv4(scope.gateway);
   let invalid=!address||address.prefix>30||!first.ok||!last.ok||!gateway.ok;
   if(address&&first.ok&&last.ok&&gateway.ok){const prefix=analyzePrefix(address.ip,address.prefix);invalid||=!contains(address,scope.first)||!contains(address,scope.last)||!contains(address,scope.gateway)||first.value>last.value||gateway.value>=first.value&&gateway.value<=last.value;
    if(prefix.ok){invalid||=scope.first===prefix.value.network||scope.last===prefix.value.broadcast||scope.gateway===prefix.value.network||scope.gateway===prefix.value.broadcast;}
    for(const peer of connectedEndpoints(config,{deviceId:device.id,portId:scope.portId})){const ip=config.devices.find(d=>d.id===peer.deviceId)?.ports.find(p=>p.id===peer.portId)?.address?.ip;const value=ip?parseIPv4(ip):null;if(value?.ok&&value.value>=first.value&&value.value<=last.value)invalid=true;}
   }
   if(invalid)errors.push(issue('INVALID_DHCP_POOL',[device.id],{port:scope.portId},'input'));
  }
 }
 for(const link of config.links)for(const ref of link.ends){
  if(!config.devices.find(d=>d.id===ref.deviceId)?.ports.some(p=>p.id===ref.portId)||occupied.has(portKey(ref)))errors.push(issue('INVALID_LINK',[ref.deviceId],{},'input',[link.id]));occupied.add(portKey(ref));
 }
 return errors;
}
