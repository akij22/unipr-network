import 'fake-indexeddb/auto';
import {expect,it,vi} from 'vitest';
import {openDatabase} from './database';
import {createDocumentRepository} from './documents';
import {emptyDocument} from '../app/controller';
import {fixture} from '../../tests/fixtures/networks';
import {createAppController} from '../app/controller';
import {createSession} from '../runtime/session';
import {memoryJournal} from '../../tests/helpers/memory-journal';
const document=()=>{const d=emptyDocument();d.name='Routed ping';d.network=fixture('routed');d.layout=Object.fromEntries(d.network.devices.map((node,i)=>[node.id,{name:node.id,x:i*3,z:0}]));return d;};
it('round trips a named configuration and prevents silent replacement',async()=>{
 const db=await openDatabase('documents-roundtrip'),repo=createDocumentRepository(db),d=document();expect(await repo.save(d)).toMatchObject({ok:true,value:d.id});
 const loaded=await repo.load(d.id);expect(loaded.ok&&loaded.value).toEqual(d);
 const other={...d,id:'another'};expect(await repo.save(other)).toMatchObject({ok:false,issue:{code:'SAVE_NAME_EXISTS'}});expect(await repo.list()).toHaveLength(1);
 expect(await repo.save({...d,name:'  '},d.id)).toMatchObject({ok:false,issue:{code:'SAVE_NAME_REQUIRED'}});db.close();
});
it('rejects malformed persisted models and unsupported schemas at runtime',async()=>{
 const db=await openDatabase('documents-corrupt'),repo=createDocumentRepository(db),d=document();
 await db.put('documents',{id:d.id,name:d.name,normalName:d.name.toLowerCase(),updatedAt:0,schema:1,document:{...d,network:{devices:[{kind:'router'}],links:[]}}});
 expect(await repo.load(d.id)).toMatchObject({ok:false,issue:{code:'SAVE_DATA_INVALID'}});
 await db.put('documents',{id:d.id,name:d.name,normalName:d.name.toLowerCase(),updatedAt:0,schema:42,document:{...d,schema:42}});expect(await repo.load(d.id)).toMatchObject({ok:false,issue:{code:'SAVE_VERSION_UNSUPPORTED'}});db.close();
});
it('reports quota failures without replacing the saved configuration',async()=>{
 const db=await openDatabase('documents-quota'),repo=createDocumentRepository(db),d=document();await repo.save(d);
 const spy=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementationOnce(()=>{throw new DOMException('quota','QuotaExceededError');});
 expect(await repo.save({...d,name:'New title'},d.id)).toMatchObject({ok:false,issue:{code:'SAVE_STORAGE_FAILED'}});spy.mockRestore();
 expect(await repo.load(d.id)).toMatchObject({ok:true,value:{name:'Routed ping'}});db.close();
});
it('reopens DHCP and NAT configuration without preserving learned runtime state',async()=>{
 const db=await openDatabase('documents-clean-runtime'),repo=createDocumentRepository(db),d=document();d.network=fixture('pat');d.layout=Object.fromEntries(d.network.devices.map((n,i)=>[n.id,{name:n.id,x:i*3,z:0}]));
 const a=d.network.devices.find(n=>n.id==='a'),r=d.network.devices.find(n=>n.kind==='router');if(a?.kind==='host'){a.addressing={mode:'dhcp'};a.ports[0].address=null;}if(r?.kind==='router')r.dhcpScopes=[{id:'scope',portId:'eth0',enabled:true,first:'192.168.1.100',last:'192.168.1.110',gateway:'192.168.1.1'}];
 await repo.save(d);const session=createSession({devices:[],links:[]},0,memoryJournal()),app=createAppController({request:req=>session.handle(req),dispose(){}},async()=>repo);
 await app.dispatch({type:'document.open',id:d.id});
 for(const operation of [{kind:'dhcp',hostId:'a'},{kind:'ping',sourceId:'a',destination:'203.0.113.10'}] as const){await app.dispatch({type:'simulation.start',operation});for(let i=0;i<100&&app.getSnapshot().projection.status==='active';i++)await app.dispatch({type:'simulation.next'});expect(app.getSnapshot().projection.status).toBe('completed');}
 expect(app.getSnapshot().projection.state.nat.r1).toHaveLength(1);await app.dispatch({type:'document.open',id:d.id});expect(app.getSnapshot().projection.state.nat.r1).toEqual([]);expect(app.getSnapshot().projection.state.dhcpClients.a).toBeNull();expect(app.getSnapshot().document.network.devices.find(n=>n.id==='a')?.ports[0].address).toBeNull();db.close();
});
it('releases a managed connection when another tab upgrades the database',async()=>{
 const db=await openDatabase('documents-upgrade');
 const upgraded=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('documents-upgrade',2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 expect(upgraded.version).toBe(2);await expect(db.getAll('documents')).rejects.toMatchObject({name:'InvalidStateError'});upgraded.close();
});
