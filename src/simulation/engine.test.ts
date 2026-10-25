import {expect,it} from 'vitest';
import {fixture,host,router,link} from '../../tests/fixtures/networks';
import {createSimulator} from './engine';
import {collectOperation} from '../../tests/helpers/engine';
import {selectRoute} from './ipv4';
import {internetChecksum,encodeIPv4Header} from './checksums';
it('resolves ARP for the first ping and reuses learned state for the second',()=>{
 const engine=createSimulator(fixture('lan'));
 const first=collectOperation(engine,{kind:'ping',sourceId:'a',destination:'192.168.1.20'});
 expect(first.some(e=>e.kind==='arp.request')).toBe(true);
 expect(first.at(-1)?.kind).toBe('operation.completed');
 const second=collectOperation(engine,{kind:'ping',sourceId:'a',destination:'192.168.1.20'});
 expect(second.some(e=>e.kind==='arp.request')).toBe(false);
 expect(second.at(-1)?.kind).toBe('operation.completed');
});
it('routes across networks with TTL and link MAC changes, preserving IP endpoints',()=>{
 const events=collectOperation(createSimulator(fixture('routed')),{kind:'ping',sourceId:'a',destination:'192.168.2.10'});
 const forwarded=events.find(e=>e.kind==='ipv4.forwarded'&&e.deviceIds.includes('r1')&&e.after[0]?.payload.kind==='ipv4'&&e.after[0].payload.dst==='192.168.2.10');
 expect(forwarded?.after[0].payload).toMatchObject({src:'192.168.1.10',dst:'192.168.2.10',ttl:63});
 expect(forwarded?.after[0].srcMac).toBe('02:00:00:00:00:0b');
 if(forwarded?.after[0].payload.kind==='ipv4')expect(internetChecksum(encodeIPv4Header(forwarded.after[0].payload))).toBe(0);
 expect(events.at(-1)?.kind).toBe('operation.completed');
});
it('reports missing gateway in the sequence instead of rejecting valid input',()=>{
 const net=fixture('routed');const a=net.devices[0];if(a.kind==='host')a.addressing={mode:'manual',gateway:null};
 const events=collectOperation(createSimulator(net),{kind:'ping',sourceId:'a',destination:'192.168.2.10'});
 expect(events.at(-1)).toMatchObject({kind:'operation.failed',detail:{kind:'failure',issue:{code:'NO_GATEWAY'}}});
});
it('does not fabricate a response for an unused IP',()=>{
 const events=collectOperation(createSimulator(fixture('lan')),{kind:'ping',sourceId:'a',destination:'192.168.1.99'});
 expect(events.filter(e=>e.kind==='arp.request')).toHaveLength(3);expect(events.at(-1)?.kind).toBe('operation.failed');
});
it('prevents false success with duplicate IPv4 addresses',()=>{
 const events=collectOperation(createSimulator(fixture('duplicateIp')),{kind:'ping',sourceId:'a',destination:'192.168.1.10'});
 expect(events.at(-1)).toMatchObject({kind:'operation.failed',detail:{kind:'failure',issue:{code:'DUPLICATE_IPV4'}}});
});
it('chooses the most specific static route and supports /31',()=>{
 const net=fixture('routed'),r=net.devices.find(d=>d.kind==='router');
 if(r?.kind==='router')r.routes=[{id:'default',destination:{ip:'0.0.0.0',prefix:0},outPortId:'eth1',nextHop:'192.168.2.2'},{id:'specific',destination:{ip:'8.8.8.8',prefix:32},outPortId:'eth0',nextHop:'192.168.1.2'}];
 expect(selectRoute(net,'r1','8.8.8.8')).toMatchObject({ok:true,value:{routeId:'specific',outPortId:'eth0'}});
 expect(collectOperation(createSimulator(fixture('router31')),{kind:'ping',sourceId:'r1',destination:'10.0.0.1'}).at(-1)?.kind).toBe('operation.completed');
});
it('returns Time Exceeded when a routed packet exhausts its TTL',()=>{
 const events=collectOperation(createSimulator(fixture('routed')),{kind:'ping',sourceId:'a',destination:'192.168.2.10',ttl:1});
 expect(events.some(e=>e.kind==='icmp.timeExceeded')).toBe(true);expect(events.at(-1)?.kind).toBe('operation.failed');
});
it('generates work progressively, restores on cancel and clears learned state on reset',()=>{
 const engine=createSimulator(fixture('lan'));expect(engine.start({kind:'ping',sourceId:'a',destination:'192.168.1.20'},'one').ok).toBe(true);
 expect(engine.snapshot().eventSequence).toBe(0);expect(engine.advance(1).kind).not.toBe('done');
 engine.cancel();expect(engine.snapshot().queue).toEqual([]);
 collectOperation(engine,{kind:'ping',sourceId:'a',destination:'192.168.1.20'});expect(Object.keys(engine.snapshot().arp).length).toBeGreaterThan(0);
 expect(engine.reset().arp).toEqual({});
});
