import type {ScheduledAction} from './types';
export function createScheduler(initial:ScheduledAction[]=[]){
 const queue=[...initial];
 return{enqueue(action:ScheduledAction){queue.push(action);queue.sort((a,b)=>a.at-b.at||a.sequence-b.sequence);},take():ScheduledAction|null{return queue.shift()??null;},snapshot():ScheduledAction[]{return queue.map(a=>({...a}));}};
}
