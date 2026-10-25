import {createRoot} from 'react-dom/client';
import {App} from './app/App';
import {createAppController} from './app/controller';
import {createSimulationClient} from './runtime/client';
import './styles/tokens.css';
import './styles/layout.css';
const worker=new Worker(new URL('./runtime/simulation.worker.ts',import.meta.url),{type:'module'});
const controller=createAppController(createSimulationClient(worker));
createRoot(document.getElementById('root')!).render(<App controller={controller}/>);
