import type {NetworkConfig,PortRef} from '../domain/types';
import type {NetworkState,StateChange} from './types';
import {BROADCAST,type EthernetFrame} from './packets';
export type ForwardResult={egress:PortRef[];learned:boolean;changes:StateChange[]};
export function forwardEthernet(config:NetworkConfig,state:NetworkState,ingress:PortRef,frame:EthernetFrame):ForwardResult{
 const device=config.devices.find(d=>d.id===ingress.deviceId);
 if(!device||!['switch','hub','bridge'].includes(device.kind))return{egress:[],learned:false,changes:[]};
 const key=`${device.id}/${frame.srcMac}`,learned=device.kind!=='hub',changes:StateChange[]=[];
 if(learned&&state.mac[key]!==ingress.portId)changes.push({table:'mac',key,before:state.mac[key]??null,after:ingress.portId});
 const known=learned&&frame.dstMac!==BROADCAST?state.mac[`${device.id}/${frame.dstMac}`]:null;
 return{egress:device.ports.filter(p=>p.id!==ingress.portId&&(!known||p.id===known)).map(p=>({deviceId:device.id,portId:p.id})),learned,changes};
}
