import type {Simulator,Operation,SimEvent} from '../../src/simulation/types';
export function collectOperation(engine:Simulator,operation:Operation,operationId='test'):SimEvent[]{
 const started=engine.start(operation,operationId);if(!started.ok)throw new Error(JSON.stringify(started.issue));
 const events:SimEvent[]=[];for(let i=0;i<10000;i++){const next=engine.advance(128);if(next.kind==='event')events.push(next.event);if(next.kind==='done')return events;}throw new Error('Test did not terminate');
}
