import {useSyncExternalStore} from 'react';
import type {AppController} from './types';
export function useApp(controller:AppController){return useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);}
