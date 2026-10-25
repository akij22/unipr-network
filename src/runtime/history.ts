import type {Journal} from '../storage/journal';
import type {NetworkState,SimEvent} from '../simulation/types';
import {applyChanges} from '../simulation/state';
export function createHistory(journal:Journal,id:string,capacity=100){
 const cache=new Map<number,SimEvent>();
 return{
  initialize:(state:NetworkState)=>journal.initialize(id,state),
  async append(event:SimEvent,state:NetworkState){await journal.append(id,event,event.index%50===0?state:undefined);cache.set(event.index,event);if(cache.size>capacity)cache.delete(cache.keys().next().value!);},
  async at(index:number){const slice=await journal.read(id,index,index);let state=slice.checkpoint.state;for(const event of slice.events)state=applyChanges(state,event.changes);const event=index===0?null:cache.get(index)??slice.events.find(e=>e.index===index)??(await journal.read(id,Math.max(0,index-1),index)).events.find(e=>e.index===index)??null;return{state,event};},
  clear:()=>journal.clear(id)
 };
}
