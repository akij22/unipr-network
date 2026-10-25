import {useEffect,useRef,useState} from 'react';
import type {AppController} from '../../app/types';
import {useApp} from '../../app/use-app';
import {presentIssue} from '../../content/issues.en';
export function SaveNetwork({controller,onClose}:{controller:AppController;onClose:()=>void}){
 const s=useApp(controller),ref=useRef<HTMLDialogElement>(null),[name,setName]=useState(s.document.name);useEffect(()=>{ref.current?.showModal();},[]);
 const save=async(overwriteId?:string)=>{await controller.dispatch({type:'document.save',name,overwriteId});if(!controller.getSnapshot().issue)ref.current?.close();};
 return <dialog ref={ref} className="protocol-dialog save-dialog" aria-label="Save network" onClose={onClose} onCancel={onClose}><div className="section-head"><h2>Save your network</h2><button onClick={()=>ref.current?.close()}>Close save dialog</button></div><p>Save devices, connections and settings in this browser. Learned state and the current simulation are not included.</p><label>Network name<input value={name} onChange={e=>setName(e.target.value)} autoFocus/></label>{s.issue&&<p className="inline-error" role="alert">{presentIssue(s.issue,s.document)}</p>}<div className="row"><button className="primary" disabled={s.busy||!name.trim()} onClick={()=>void save()}>{s.busy?'Saving…':'Save configuration'}</button>{s.issue&&['SAVE_NAME_EXISTS','SAVE_OVERWRITE_REQUIRED'].includes(s.issue.code)&&typeof s.issue.params.id==='string'&&<button disabled={s.busy} onClick={()=>void save(String(s.issue!.params.id))}>Overwrite saved network</button>}</div><p className="muted small">Local to this browser. Your networks are not synced to other devices.</p></dialog>;
}
