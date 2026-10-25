import {useState} from 'react';
import type {AppController} from './types';
import {useApp} from './use-app';
import {DeviceCatalog} from '../features/editor/DeviceCatalog';
import {DeviceInspector} from '../features/editor/DeviceInspector';
import {ConnectionBuilder} from '../features/editor/ConnectionBuilder';
import {presentIssue} from '../content/issues.en';
import {NetworkScene} from '../features/scene/NetworkScene';
import {SimulationControls} from '../features/simulation/SimulationControls';
import {EventSummary} from '../features/simulation/EventSummary';
import {PacketInspector} from '../features/simulation/PacketInspector';
import {SaveNetwork} from '../features/saved-networks/SaveNetwork';
import {SavedNetworks} from '../features/saved-networks/SavedNetworks';
export function App({controller}:{controller:AppController}){
 const state=useApp(controller),[catalog,setCatalog]=useState(false),[save,setSave]=useState(false),[networks,setNetworks]=useState(false);
 return <div className="app"><header className="topbar"><a className="brand" href="#workspace"><svg viewBox="0 0 36 28" aria-hidden="true"><path d="M4 7h10v14h18M14 7h18"/><rect x="1" y="3" width="6" height="8"/><rect x="28" y="3" width="6" height="8"/><rect x="28" y="17" width="6" height="8"/></svg><strong>unipr<span>.network</span></strong></a><div className="document-name"><span className="eyebrow">NETWORK LAB</span><span>{state.document.name}{state.dirty?' · Unsaved':''}</span></div><button className="tutorial-toggle" role="switch" aria-checked={state.tutorial} aria-label="Tutorial mode" onClick={()=>void controller.dispatch({type:'tutorial.set',enabled:!state.tutorial})}>Tutorial <span>{state.tutorial?'On':'Off'}</span></button><div className="row header-actions"><button aria-label="My networks" onClick={()=>{void controller.dispatch({type:'simulation.play',enabled:false});setNetworks(true);}}>My networks</button><button className="primary" aria-label="Save network" disabled={state.busy} onClick={()=>{void controller.dispatch({type:'issue.clear'});void controller.dispatch({type:'simulation.play',enabled:false});setSave(true);}}>Save</button></div></header>
 {state.issue&&!save&&!networks&&<div role="alert" className="alert"><div><strong>{state.issue.category==='network'?'Communication stopped':state.issue.category==='input'?'Check your configuration':'Action needs attention'}</strong><p>{presentIssue(state.issue,state.document)}</p></div><button onClick={()=>void controller.dispatch({type:'issue.clear'})}>Dismiss</button></div>}
 {state.notice&&!save&&!networks&&<div role="status" className="notice">{state.notice}</div>}{save&&<SaveNetwork controller={controller} onClose={()=>setSave(false)}/>} {networks&&<SavedNetworks controller={controller} onClose={()=>setNetworks(false)}/>}<main id="workspace" className="workspace"><div className="lab"><div className="lab-toolbar"><div><span className="eyebrow">WORKSPACE</span><h1>Your network</h1></div><div className="row"><button onClick={()=>setCatalog(!catalog)} aria-expanded={catalog}>Add device</button><button disabled={state.document.network.devices.length<2} onClick={()=>void controller.dispatch({type:'connection.start'})}>Connect ports</button></div></div>
 {catalog&&<DeviceCatalog controller={controller} onClose={()=>setCatalog(false)}/>}<ConnectionBuilder controller={controller}/>
 <SimulationControls controller={controller}/><EventSummary controller={controller}/><NetworkScene controller={controller}/>
 <div className="device-strip" aria-label="Network devices">{state.document.network.devices.map(d=><button key={d.id} aria-label={`Select ${state.document.layout[d.id]?.name??d.id}`} aria-pressed={state.selection?.id===d.id} onClick={()=>void controller.dispatch({type:'selection.set',selection:{kind:'device',id:d.id}})}><strong>{state.document.layout[d.id]?.name??d.id}</strong><span>{d.kind}</span></button>)}</div>
 <div className="link-list">{state.document.network.links.map((l,i)=><button key={l.id} onClick={()=>void controller.dispatch({type:'selection.set',selection:{kind:'link',id:l.id}})}>Link {i+1}: {l.ends.map(e=>`${state.document.layout[e.deviceId].name} · ${e.portId}`).join(' ↔ ')}</button>)}</div>
 <PacketInspector controller={controller}/></div><DeviceInspector controller={controller}/></main><footer className="statusbar"><span>{state.document.network.devices.length} devices · {state.document.network.links.length} links</span><span>{state.busy?'Updating network…':'Ready to explore'}</span><span>Ethernet · IPv4</span></footer></div>;
}
