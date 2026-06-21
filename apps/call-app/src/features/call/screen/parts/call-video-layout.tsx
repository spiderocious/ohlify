import { type RefObject } from 'react';

interface Props {
  localVideoRef: RefObject<HTMLDivElement | null>;
  remoteVideoRef: RefObject<HTMLDivElement | null>;
}

export function CallVideoLayout({ localVideoRef, remoteVideoRef }: Props) {
  return (
    <div className="relative w-full h-full">
      <div ref={remoteVideoRef as RefObject<HTMLDivElement>} className="w-full h-full bg-zinc-900" />
      <div
        ref={localVideoRef as RefObject<HTMLDivElement>}
        className="absolute bottom-4 right-4 w-28 h-36 rounded-xl overflow-hidden border-2 border-zinc-700 bg-zinc-800"
      />
    </div>
  );
}
