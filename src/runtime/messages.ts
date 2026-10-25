import type {NetworkConfig,Result} from '../domain/types';
import type {NetworkState,Operation,SimEvent} from '../simulation/types';
export type Projection={revision:number;operationId:string|null;cursor:number;frontier:number;total:number|null;status:'idle'|'active'|'completed'|'failed'|'resource-error';event:SimEvent|null;state:NetworkState};
export type SessionCommand={type:'load';network:NetworkConfig}|{type:'start';operation:Operation}|{type:'next'}|{type:'seek';index:number}|{type:'cancel'}|{type:'reset'};
export type WorkerRequest={requestId:number;revision:number;operationId:string|null;command:SessionCommand};
export type WorkerResponse={requestId:number;revision:number;operationId:string|null;result:Result<Projection>};
export interface SimulationClient{request(request:WorkerRequest):Promise<Result<Projection>>;dispose():void}
