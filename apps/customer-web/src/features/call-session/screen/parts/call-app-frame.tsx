import { forwardRef } from 'react';

import { CALL_APP_URL } from '@shared/config/call-app-url.js';

interface Props {
  allow?: string;
}

/**
 * Full-screen iframe pointing at the call-app /call route.
 * The ref is forwarded so the parent can postMessage into it.
 */
export const CallAppFrame = forwardRef<HTMLIFrameElement, Props>(
  ({ allow = 'microphone; camera' }, ref) => (
    <iframe
      ref={ref}
      src={`${CALL_APP_URL}/call`}
      allow={allow}
      className="absolute inset-0 h-full w-full border-0"
      title="Call"
    />
  ),
);

CallAppFrame.displayName = 'CallAppFrame';
