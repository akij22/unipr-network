import {fail,issue,type Result} from '../domain/types';
import type {Projection,SimulationClient,WorkerRequest,WorkerResponse} from './messages';
export function createSimulationClient(worker:Worker):SimulationClient{
 const pending=new Map<number,{request:WorkerRequest;resolve:(r:Result<Projection>)=>void}>();
 worker.onmessage=(e:MessageEvent<WorkerResponse>)=>{const match=pending.get(e.data.requestId);if(!match)return;pending.delete(e.data.requestId);if(e.data.revision!==match.request.revision||e.data.operationId!==match.request.operationId)match.resolve(fail(issue('STALE_RESPONSE',[],{},'resource')));else match.resolve(e.data.result);};
 worker.onerror=(e)=>{console.error('Simulation worker failed',e);for(const {resolve}of pending.values())resolve(fail(issue('WORKER_FAILURE',[],{},'resource')));pending.clear();};
 return{request(request){return new Promise(resolve=>{pending.set(request.requestId,{request,resolve});try{worker.postMessage(request);}catch(cause){pending.delete(request.requestId);console.error('Worker message could not be sent',cause);resolve(fail(issue('WORKER_FAILURE',[],{},'resource')));}});},dispose(){worker.terminate();for(const{resolve}of pending.values())resolve(fail(issue('WORKER_CLOSED',[],{},'resource')));pending.clear();}};
}
