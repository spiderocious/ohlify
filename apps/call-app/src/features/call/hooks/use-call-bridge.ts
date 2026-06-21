import { useCallback, useEffect, useRef } from 'react';

import {
  CA_EVENTS,
  type CallAppToParent,
  type ParentToCallApp,
  emitToParent,
  parseBridgeMessage,
} from '@shared/bridge/index.js';

export interface CallBridgeHandle {
  emit: (msg: CallAppToParent) => void;
  onCommand: (handler: (msg: ParentToCallApp) => void) => void;
}

export function useCallBridge(): CallBridgeHandle {
  const handlerRef = useRef<((msg: ParentToCallApp) => void) | null>(null);

  const emit = useCallback((msg: CallAppToParent) => {
    emitToParent(msg);
  }, []);

  const onCommand = useCallback((handler: (msg: ParentToCallApp) => void) => {
    handlerRef.current = handler;
  }, []);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const msg = parseBridgeMessage(event);
      if (!msg) return;
      handlerRef.current?.(msg);
    };
    window.addEventListener('message', listener);

    // Signal to the parent that the call-app is ready.
    emit({ type: CA_EVENTS.READY });

    return () => window.removeEventListener('message', listener);
  }, [emit]);

  return { emit, onCommand };
}
