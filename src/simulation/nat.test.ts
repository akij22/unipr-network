import {expect,it} from 'vitest';
import {fixture} from '../../tests/fixtures/networks';
import {createSimulator} from './engine';
import {collectOperation} from '../../tests/helpers/engine';
import {translateInbound,translateOutbound} from './nat';
import {createInitialState,applyChanges} from './state';
import {makeIcmp} from './icmp';
import {encodeIPv4Header,encodeIcmp,internetChecksum} from './checksums';
import {validateConfiguration} from '../domain/configuration';
import {router} from '../../tests/fixtures/networks';
it('shares the outside address while keeping identical inside identifiers distinct',()=>{
 const engine=createSimulator(fixture('pat'));
 const a=collectOperation(engine,{kind:'ping',sourceId:'a',destination:'203.0.113.10',identifier:1});
 const b=collectOperation(engine,{kind:'ping',sourceId:'b',destination:'203.0.113.10',identifier:1});
 expect(a.some(e=>e.kind==='nat.translated')).toBe(true);expect(a.at(-1)?.kind).toBe('operation.completed');expect(b.at(-1)?.kind).toBe('operation.completed');
 const bindings=engine.snapshot().nat.r1;expect(bindings).toHaveLength(2);expect(bindings[0].outsideIp).toBe('203.0.113.1');expect(bindings[0].outsideIdentifier).not.toBe(bindings[1].outsideIdentifier);
 const inbound=b.find(e=>e.kind==='nat.translated'&&e.detail.kind==='translation'&&e.detail.direction==='inbound');expect(inbound?.after[0].payload).toMatchObject({dst:'192.168.1.11',payload:{identifier:1}});
});
it('translates quoted headers in ICMP errors and keeps checksums valid',()=>{
 const config=fixture('pat'),r=config.devices.find(d=>d.kind==='router')!;let state=createInitialState(config);
 const outbound=translateOutbound(r,state,makeIcmp('192.168.1.10','203.0.113.10',8,45));expect(outbound.ok).toBe(true);if(!outbound.ok)return;state=applyChanges(state,outbound.value.changes);
 const error=makeIcmp('203.0.113.254','203.0.113.1',11,0,64,outbound.value.packet);
 const inbound=translateInbound(r,state,error);expect(inbound.ok).toBe(true);if(!inbound.ok)return;
 const packet=inbound.value.packet;expect(packet.dst).toBe('192.168.1.10');expect(packet.payload).toMatchObject({kind:'icmp',quote:{src:'192.168.1.10',payload:{kind:'icmp',identifier:45}}});
 expect(internetChecksum(encodeIPv4Header(packet))).toBe(0);if(packet.payload.kind==='icmp')expect(internetChecksum(encodeIcmp(packet.payload))).toBe(0);
});
it('does not allocate a translation when there is no route and rejects unmatched replies',()=>{
 const config=fixture('pat'),r=config.devices.find(d=>d.kind==='router')!;
 const engine=createSimulator(config);collectOperation(engine,{kind:'ping',sourceId:'a',destination:'198.51.100.1'});expect(engine.snapshot().nat.r1).toEqual([]);
 expect(translateInbound(r,createInitialState(config),makeIcmp('203.0.113.10','203.0.113.1',0,99))).toMatchObject({ok:false,issue:{code:'NAT_NO_BINDING'}});
});
it('rejects nested translations explicitly',()=>{
 const config=fixture('pat'),r=config.devices.find(d=>d.kind==='router')!;
 const packet={...makeIcmp('192.168.1.10','203.0.113.10',8,1),translations:['another-router']};
 expect(translateOutbound(r,createInitialState(config),packet)).toMatchObject({ok:false,issue:{code:'NESTED_NAT_UNSUPPORTED',category:'model'}});
});
it('rejects ambiguous NAT interfaces before running',()=>{
 const n=fixture('pat'),r=n.devices.find(d=>d.kind==='router');if(r?.kind==='router')r.nat!.insidePortIds=['eth1'];expect(validateConfiguration(n).some(i=>i.code==='INVALID_NAT_CONFIG')).toBe(true);
});
it('returns a real Time Exceeded through PAT with a restored quoted source',()=>{
 const n=fixture('pat'),r=n.devices.find(d=>d.kind==='router');if(r?.kind==='router')r.routes=[{id:'remoteNet',destination:{ip:'198.51.100.0',prefix:24},outPortId:'eth1',nextHop:'203.0.113.10'}];n.devices=n.devices.map(d=>d.id==='remote'?router('remote',['203.0.113.10','198.51.100.1'],30):d);
 const events=collectOperation(createSimulator(n),{kind:'ping',sourceId:'a',destination:'198.51.100.10',identifier:1,ttl:2});
 expect(events.some(e=>e.kind==='icmp.timeExceeded')).toBe(true);const translated=events.find(e=>e.kind==='nat.translated'&&e.detail.kind==='translation'&&e.detail.direction==='inbound');expect(translated?.after[0].payload).toMatchObject({dst:'192.168.1.10',payload:{kind:'icmp',type:11,quote:{src:'192.168.1.10'}}});
});
