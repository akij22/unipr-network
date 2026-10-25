import type {PortRef} from '../domain/types';
export {connectedEndpoints as l2Endpoints} from '../domain/topology';
export const arpKey=(ref:PortRef,ip:string)=>`${ref.deviceId}/${ref.portId}/${ip}`;
