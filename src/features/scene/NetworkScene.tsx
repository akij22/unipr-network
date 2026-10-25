import {Canvas} from '@react-three/fiber';
import {Grid} from '@react-three/drei';
import {useMemo,useState} from 'react';
import type {AppController} from '../../app/types';
import {useApp} from '../../app/use-app';
import {buildSceneView} from './scene-view';
import {DeviceModel} from './DeviceModel';
import {LinkModel} from './LinkModel';
import {PacketModel} from './PacketModel';
import {CameraControls,type CameraCommand} from './CameraControls';
import {sceneColors as c} from '../../styles/scene-tokens';
export function NetworkScene({controller}:{controller:AppController}){
 const state=useApp(controller),[ready,setReady]=useState(false),[command,setCommand]=useState<CameraCommand|null>(null);
 const view=useMemo(()=>buildSceneView(state.document,state.projection,state.selection),[state.document,state.projection,state.selection]);
 const span=Math.max(8,...view.devices.map(d=>Math.abs(d.x)*2),...view.devices.map(d=>Math.abs(d.z)*2));
 const send=(type:CameraCommand['type'])=>setCommand(c=>({type,serial:(c?.serial??0)+1}));
 return <section className="network-stage" aria-label="3D network workspace" data-scene-ready={ready}>
 <div className="scene-canvas"><Canvas orthographic camera={{position:[12,14,18],zoom:30,near:.1,far:1000}} frameloop="demand" dpr={[1,1.5]} onCreated={()=>setReady(true)} onPointerMissed={()=>void controller.dispatch({type:'selection.set',selection:null})}><color attach="background" args={[c.background]}/><ambientLight intensity={1.8}/><directionalLight position={[6,14,8]} intensity={2}/><Grid args={[100,100]} cellSize={1} cellColor={c.grid} sectionColor={c.grid} sectionSize={5} fadeDistance={65} infiniteGrid/><CameraControls controller={controller} command={command} span={span}/>{view.links.map(link=><LinkModel key={link.id} link={link} onSelect={()=>void controller.dispatch({type:'selection.set',selection:{kind:'link',id:link.id}})}/>)}{view.devices.map(device=><DeviceModel key={device.id} device={device} onSelect={()=>void controller.dispatch({type:'selection.set',selection:{kind:'device',id:device.id}})}/>)}{view.packets.map(packet=>{const link=view.links.find(l=>l.id===packet.linkId);return link?<PacketModel key={`${state.projection.cursor}:${packet.id}`} link={link} playing={state.playing}/>:null;})}</Canvas></div>
 <div className="scene-hud"><span className="eyebrow">3D WORKSPACE</span><span>{state.projection.event?`Event ${state.projection.cursor}`:'Orbit, connect, explore'}</span></div>
 {!view.devices.length&&<div className="scene-empty"><h2>Start with a connection.</h2><p>Add a host and a switch to build your first network.</p></div>}
 <div className="camera-toolbar" aria-label="Camera controls">{([['left','Orbit left','↶'],['right','Orbit right','↷'],['out','Zoom out','−'],['in','Zoom in','+'],['reset','Reset view','Reset view']] as const).map(([type,label,text])=><button key={type} aria-label={label} onClick={()=>send(type)}>{text}</button>)}</div><span className="scene-help">Drag to orbit · Pinch or use + / − to zoom</span>
 </section>;
}
