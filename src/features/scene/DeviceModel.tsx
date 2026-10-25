import {Html} from '@react-three/drei';
import {BoxGeometry,MeshStandardMaterial,TorusGeometry} from 'three';
import type {SceneDevice} from './scene-view';
import {sceneColors as c} from '../../styles/scene-tokens';
const box=new BoxGeometry(1,1,1),ring=new TorusGeometry(1.4,.025,6,48);
const material=Object.fromEntries(Object.entries(c).map(([name,color])=>[name,new MeshStandardMaterial({color,roughness:.72,metalness:.15})])) as Record<keyof typeof c,MeshStandardMaterial>;
function Part({at,size,tone='shell'}:{at:[number,number,number];size:[number,number,number];tone?:keyof typeof c}){return <mesh geometry={box} material={material[tone]} position={at} scale={size} castShadow receiveShadow dispose={null}/>;}
export function DeviceModel({device,onSelect}:{device:SceneDevice;onSelect:()=>void}){
 const d=device;return <group position={[d.x,0,d.z]} onClick={e=>{e.stopPropagation();onSelect();}}>
 {d.kind==='host'?<><Part at={[-.2,1.1,0]} size={[1.55,1.1,.16]} tone="face"/><Part at={[-.2,1.12,.092]} size={[1.35,.9,.025]} tone="screen"/><Part at={[-.2,.42,-.02]} size={[.12,.45,.12]}/><Part at={[-.2,.16,.1]} size={[.8,.1,.5]}/><Part at={[.95,.6,-.12]} size={[.42,1.05,.75]} tone="face"/><Part at={[-.2,.12,.82]} size={[1.1,.08,.38]} tone="shell"/></>:<><Part at={[0,.38,0]} size={[d.kind==='hub'?1.8:2.25,d.kind==='router'?.6:.36,1.2]} tone={d.kind}/><Part at={[0,.39,.615]} size={[d.kind==='hub'?1.7:2.12,.25,.04]} tone="face"/>{Array.from({length:Math.min(d.ports,12)},(_,i)=><group key={i} position={[(i-(Math.min(d.ports,12)-1)/2)*.18,.39,.65]}><Part at={[0,0,0]} size={[.13,.12,.035]} tone="port"/><Part at={[.035,.09,0]} size={[.025,.025,.02]} tone="accent"/></group>)}{d.kind==='router'&&<><Part at={[-.4,.7,0]} size={[.7,.025,.12]} tone="light"/><Part at={[.4,.7,.2]} size={[.7,.025,.12]} tone="light"/></>}</>}
 {d.selected&&<mesh geometry={ring} material={material.selected} rotation={[-Math.PI/2,0,0]} position={[0,.045,0]} dispose={null}/>}
 <Html position={[0,d.kind==='host'?2.05:1.15,0]} center distanceFactor={undefined} style={{pointerEvents:'auto'}}><button className={`scene-label ${d.selected?'selected':''}`} onClick={e=>{e.stopPropagation();onSelect();}}><strong>{d.name}</strong>{d.ip&&<code>{d.ip}</code>}</button></Html>
 </group>;
}
