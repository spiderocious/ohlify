import { forwardRef } from 'react';

interface Props {
  src: string;
}

export const CallFrame = forwardRef<HTMLIFrameElement, Props>(({ src }, ref) => {
  return (
    <div className="rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 aspect-[9/16] w-full max-w-xs mx-auto">
      <iframe
        ref={ref}
        src={src}
        allow="microphone; camera"
        className="w-full h-full"
        title="Call App"
      />
    </div>
  );
});

CallFrame.displayName = 'CallFrame';
