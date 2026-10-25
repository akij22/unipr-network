import {expect,it} from 'vitest';
import {createScheduler} from './scheduler';
import {createInitialState,applyChanges} from './state';
import {fixture} from '../../tests/fixtures/networks';
it('orders actions by virtual time and stable sequence',()=>{
 const queue=createScheduler();
 queue.enqueue({id:'later',at:100,sequence:0,type:'tick',causeId:null});
 queue.enqueue({id:'second',at:0,sequence:2,type:'tick',causeId:null});
 queue.enqueue({id:'first',at:0,sequence:1,type:'tick',causeId:null});
 expect([queue.take()?.id,queue.take()?.id,queue.take()?.id]).toEqual(['first','second','later']);
 expect(queue.take()).toBeNull();
});
it('starts unassigned DHCP clients and applies reversible state changes immutably',()=>{
 const state=createInitialState(fixture('dhcp'));
 expect(state.clock).toBe(0);expect(state.dhcpClients.a).toBeNull();
 const next=applyChanges(state,[{table:'arp',key:'a/192.168.1.1',before:null,after:'02:00:00:00:00:10'}]);
 expect(state.arp['a/192.168.1.1']).toBeUndefined();
 expect(next.arp['a/192.168.1.1']).toBe('02:00:00:00:00:10');
});
