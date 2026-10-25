import {useRef,useMemo,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {BoxGeometry,MeshStandardMaterial,type Mesh} from 'three';
import type {SceneLink} from './scene-view';
import {linkCurve} from './LinkModel';
import {sceneColors} from '../../styles/scene-tokens';
const geometry=new BoxGeometry(.24,.18,.3),material=new MeshStandardMaterial({color:sceneColors.packet,emissive:sceneColors.packet,emissiveIntensity:.25});
export function PacketModel({link,playing}:{link:SceneLink;playing:boolean}){const ref=useRef<Mesh>(null),progress=useRef(playing?0:.55),curve=useMemo(()=>linkCurve(link),[...link.from,...link.to]),invalidate=useThree(s=>s.invalidate);useEffect(()=>{progress.current=playing?0:.55;invalidate();},[playing,link.id,invalidate]);useFrame((_,delta)=>{if(!ref.current)return;if(playing&&progress.current<1){progress.current=Math.min(1,progress.current+delta/0.65);invalidate();}ref.current.position.copy(curve.getPoint(link.reverse?1-progress.current:progress.current));ref.current.position.y+=.2;});return <mesh ref={ref} geometry={geometry} material={material} dispose={null}/>;}
