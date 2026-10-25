import {expect,it} from 'vitest';
import {createAppController} from './controller';
import {createSession} from '../runtime/session';
import {memoryJournal} from '../../tests/helpers/memory-journal';
function make(){const session=createSession({devices:[],links:[]},0,memoryJournal());return createAppController({request:r=>session.handle(r),dispose(){}});}
it('adds five device types and preserves network state through visual edits',async()=>{
 const app=make();for(const kind of ['host','router','switch','bridge','hub'] as const)await app.dispatch({type:'device.add',kind});
 expect(app.getSnapshot().document.network.devices).toHaveLength(5);
 const revision=app.getSnapshot().projection.revision,mac=app.getSnapshot().document.network.devices[0].ports[0].mac;
 await app.dispatch({type:'device.move',id:'host-1',x:4,z:2});await app.dispatch({type:'device.rename',id:'host-1',name:'My host'});
 expect(app.getSnapshot().projection.revision).toBe(revision);expect(app.getSnapshot().document.network.devices[0].ports[0].mac).toBe(mac);
});
it('creates a cable using two explicit port selections',async()=>{
 const app=make();await app.dispatch({type:'device.add',kind:'host'});await app.dispatch({type:'device.add',kind:'switch'});
 await app.dispatch({type:'connection.start'});await app.dispatch({type:'connection.choosePort',port:{deviceId:'host-1',portId:'eth0'}});await app.dispatch({type:'connection.choosePort',port:{deviceId:'switch-1',portId:'p1'}});
 expect(app.getSnapshot().document.network.links).toHaveLength(1);expect(app.getSnapshot().connection).toBeNull();
});
it('turning off tutorial does not assign or erase network parameters',async()=>{
 const app=make();await app.dispatch({type:'device.add',kind:'host'});await app.dispatch({type:'tutorial.set',enabled:false});
 expect(app.getSnapshot().document.network.devices[0].ports[0].address).toBeNull();
});
