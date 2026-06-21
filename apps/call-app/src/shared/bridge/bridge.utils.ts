import type { CallAppToParent, ParentToCallApp } from './bridge.types.js';

let _seq = 0;
export const createRequestId = (): string => `rq_${Date.now()}_${++_seq}`;

export const parseBridgeMessage = (event: MessageEvent): ParentToCallApp | null => {
  if (!event.data || typeof event.data !== 'object') return null;
  const { type } = event.data as { type?: unknown };
  if (typeof type !== 'string' || !type.startsWith('ca:')) return null;
  return event.data as ParentToCallApp;
};

export const emitToParent = (msg: CallAppToParent): void => {
  const target = window.parent !== window ? window.parent : null;
  if (target) {
    target.postMessage(msg, '*');
  }
};
