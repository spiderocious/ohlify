import { useSyncExternalStore } from 'react';

import { drawerStore } from './store.js';

const getModals = () => drawerStore.getModals();
const getToasts = () => drawerStore.getToasts();

export function useModals() {
  return useSyncExternalStore((l) => drawerStore.subscribe(l), getModals, getModals);
}

export function useToasts() {
  return useSyncExternalStore((l) => drawerStore.subscribe(l), getToasts, getToasts);
}
