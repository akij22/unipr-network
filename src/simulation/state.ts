import type {NetworkConfig} from '../domain/types';
import type {NetworkState,StateChange} from './types';
export const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
export function createInitialState(config:NetworkConfig):NetworkState{
 return{clock:0,sequence:0,packetSequence:0,eventSequence:0,identifier:1,queue:[],arp:{},mac:{},dhcpClients:Object.fromEntries(config.devices.filter(d=>d.kind==='host'&&d.addressing.mode==='dhcp').map(d=>[d.id,null])),dhcpLeases:{},offers:{},nat:Object.fromEntries(config.devices.filter(d=>d.kind==='router').map(d=>[d.id,[]])),operation:null,result:null,problem:null};
}
export function applyChanges(state:NetworkState,changes:readonly StateChange[]):NetworkState{
 const next={...state};
 for(const change of changes){
  if('key' in change){const table={...next[change.table]};if(change.after===null)delete table[change.key];else table[change.key]=copy(change.after);Object.assign(next,{[change.table]:table});}
  else Object.assign(next,{[change.table]:copy(change.after)});
 }
 return next;
}
export function diffState(before:NetworkState,after:NetworkState):StateChange[]{
 const changes:StateChange[]=[];
 for(const table of Object.keys(after) as (keyof NetworkState)[]){
  if(['arp','mac','dhcpClients','dhcpLeases','offers','nat'].includes(table)){
   const a=before[table] as Record<string,unknown>,b=after[table] as Record<string,unknown>;
   for(const key of new Set([...Object.keys(a),...Object.keys(b)]))if(JSON.stringify(a[key])!==JSON.stringify(b[key]))changes.push({table,key,before:a[key]??null,after:b[key]??null} as StateChange);
  }else if(JSON.stringify(before[table])!==JSON.stringify(after[table]))changes.push({table,before:before[table],after:after[table]} as StateChange);
 }
 return copy(changes);
}
