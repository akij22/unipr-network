import type {NetworkState,SimEvent} from '../simulation/types';
import type {AppDatabase} from './database';
export type JournalSlice={checkpoint:{index:number;state:NetworkState};events:SimEvent[]};
export interface Journal{initialize(operationId:string,state:NetworkState):Promise<void>;append(operationId:string,event:SimEvent,checkpoint?:NetworkState):Promise<void>;read(operationId:string,from:number,to:number):Promise<JournalSlice>;clear(operationId:string):Promise<void>}
const range=(id:string,to=Number.MAX_SAFE_INTEGER)=>IDBKeyRange.bound([id,0],[id,to]);
export function createJournal(db:AppDatabase):Journal{return{
 async initialize(operationId,state){await db.put('journalCheckpoints',{operationId,index:0,state});},
 async append(operationId,event,state){const tx=db.transaction(['journalEvents','journalCheckpoints'],'readwrite');await tx.objectStore('journalEvents').put({operationId,index:event.index,event});if(state)await tx.objectStore('journalCheckpoints').put({operationId,index:event.index,state});await tx.done;},
 async read(operationId,from,to){const tx=db.transaction(['journalEvents','journalCheckpoints']);const checkpoints=await tx.objectStore('journalCheckpoints').getAll(range(operationId,from));const checkpoint=checkpoints.at(-1);if(!checkpoint)throw new Error('HISTORY_CHECKPOINT_MISSING');const rows=await tx.objectStore('journalEvents').getAll(IDBKeyRange.bound([operationId,checkpoint.index],[operationId,to],true));return{checkpoint:{index:checkpoint.index,state:checkpoint.state},events:rows.map(r=>r.event)};},
 async clear(operationId){const tx=db.transaction(['journalEvents','journalCheckpoints'],'readwrite');await Promise.all([tx.objectStore('journalEvents').delete(range(operationId)),tx.objectStore('journalCheckpoints').delete(range(operationId))]);await tx.done;}
};}
