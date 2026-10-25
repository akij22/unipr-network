import {expect,it} from 'vitest';
import {fixture,fabric} from '../../tests/fixtures/networks';
import {createInitialState,applyChanges} from './state';
import {forwardEthernet} from './ethernet';
import {BROADCAST,type EthernetFrame} from './packets';
const frame:EthernetFrame={id:'f1',rootId:'root',srcMac:'02:00:00:00:00:01',dstMac:BROADCAST,payload:{kind:'arp',opcode:'request',senderIp:'192.168.1.10',targetIp:'192.168.1.20',senderMac:'02:00:00:00:00:01',targetMac:'00:00:00:00:00:00'}};
it('learns the source and floods only other ports',()=>{
 const net=fixture('lan'),state=createInitialState(net);
 const result=forwardEthernet(net,state,{deviceId:'s1',portId:'p1'},frame);
 expect(result.egress.map(p=>p.portId)).toEqual(['p2','p3','p4']);
 const learned=applyChanges(state,result.changes);
 const reply=forwardEthernet(net,learned,{deviceId:'s1',portId:'p2'},{...frame,srcMac:'02:00:00:00:00:02',dstMac:frame.srcMac});
 expect(reply.egress).toEqual([{deviceId:'s1',portId:'p1'}]);
});
it('hubs repeat without learning',()=>{
 const net={devices:[fabric('h','hub')],links:[]};
 const result=forwardEthernet(net,createInitialState(net),{deviceId:'h',portId:'p1'},frame);
 expect(result.learned).toBe(false);expect(result.changes).toEqual([]);expect(result.egress).toHaveLength(3);
});
