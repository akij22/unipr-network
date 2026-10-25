import {expect,it} from 'vitest';
import {createSession} from './session';
import {fixture} from '../../tests/fixtures/networks';
import {memoryJournal} from '../../tests/helpers/memory-journal';
import type {SessionCommand,Projection} from './messages';
function harness(){const session=createSession(fixture('routed'),1,memoryJournal());let id=0;return{session,send:(command:SessionCommand,op:string|null='op')=>session.handle({requestId:++id,revision:1,operationId:op,command})};}
it('restores complete observed state without rerunning the engine',async()=>{
 const h=harness();await h.send({type:'start',operation:{kind:'ping',sourceId:'a',destination:'192.168.2.10'}});
 const snapshots:Projection[]=[];for(let n=0;n<200;n++){const r=await h.send({type:'next'});expect(r.ok).toBe(true);if(!r.ok)break;snapshots.push(r.value);if(r.value.status!=='active')break;}
 expect(snapshots.at(-1)?.status).toBe('completed');expect(snapshots[0].total).toBeNull();
 const target=snapshots.find(s=>Object.keys(s.state.arp).length>0)!;
 const rewind=await h.send({type:'seek',index:target.cursor});expect(rewind.ok&&rewind.value.state).toEqual(target.state);
 expect(await h.send({type:'start',operation:{kind:'ping',sourceId:'a',destination:'192.168.2.10'}},'new')).toMatchObject({ok:false,issue:{code:'HISTORY_NOT_AT_FRONTIER'}});
 const replay=await h.send({type:'next'});expect(replay.ok&&replay.value.event).toEqual(snapshots[target.cursor].event);
});
it('rejects stale revisions and duplicate requests',async()=>{
 const h=harness();await h.send({type:'reset'},null);
 expect(await h.session.handle({requestId:1,revision:1,operationId:null,command:{type:'reset'}})).toMatchObject({ok:false,issue:{code:'STALE_REQUEST'}});
 expect(await h.session.handle({requestId:2,revision:0,operationId:null,command:{type:'reset'}})).toMatchObject({ok:false,issue:{code:'STALE_REVISION'}});
});
it('stops safely when the journal cannot be written',async()=>{
 const journal=memoryJournal();journal.append=async()=>{throw new Error('quota');};
 const session=createSession(fixture('lan'),1,journal);
 await session.handle({requestId:1,revision:1,operationId:'x',command:{type:'start',operation:{kind:'ping',sourceId:'a',destination:'192.168.1.20'}}});
 const result=await session.handle({requestId:2,revision:1,operationId:'x',command:{type:'next'}});
 expect(result).toMatchObject({ok:true,value:{status:'resource-error',frontier:0}});
});
it('restores an explicitly unassigned DHCP client while replaying a second acquisition',async()=>{
 const session=createSession(fixture('dhcp'),1,memoryJournal());let id=0,op='first';
 const send=(command:SessionCommand)=>session.handle({requestId:++id,revision:1,operationId:op,command});
 for(let run=0;run<2;run++){
  await send({type:'start',operation:{kind:'dhcp',hostId:'a'}});
  for(let i=0;i<100;i++){const r=await send({type:'next'});if(r.ok&&r.value.status!=='active')break;}
  if(run===0)op='second';
 }
 const restored=await send({type:'seek',index:1});expect(restored.ok&&restored.value.state.dhcpClients.a).toBeNull();
});
