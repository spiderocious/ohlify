import { type RefObject } from 'react';

interface Props {
  localVideoRef: RefObject<HTMLDivElement | null>;
  remoteVideoRef: RefObject<HTMLDivElement | null>;
  /** Third participant. Absent on an ordinary two-party call. */
  secondRemoteVideoRef?: RefObject<HTMLDivElement | null>;
  hasSecondRemote?: boolean;
}

/**
 * Two-party stays exactly as it was — one full-bleed remote with a local
 * thumbnail. Adding a third splits the remote area in half rather than
 * shrinking everyone into a grid: with three people the conversation is still
 * mostly two-way at any moment, and equal-sized tiles would waste the screen
 * on whoever is not speaking.
 */
export function CallVideoLayout({
  localVideoRef,
  remoteVideoRef,
  secondRemoteVideoRef,
  hasSecondRemote = false,
}: Props) {
  return (
    <div className="relative w-full h-full">
      {hasSecondRemote && secondRemoteVideoRef ? (
        <div className="grid h-full w-full grid-rows-2 gap-0.5">
          <div ref={remoteVideoRef as RefObject<HTMLDivElement>} className="w-full h-full bg-zinc-900" />
          <div
            ref={secondRemoteVideoRef as RefObject<HTMLDivElement>}
            className="w-full h-full bg-zinc-900"
          />
        </div>
      ) : (
        <div ref={remoteVideoRef as RefObject<HTMLDivElement>} className="w-full h-full bg-zinc-900" />
      )}
      <div
        ref={localVideoRef as RefObject<HTMLDivElement>}
        className="absolute bottom-4 right-4 w-28 h-36 rounded-xl overflow-hidden border-2 border-zinc-700 bg-zinc-800"
      />
    </div>
  );
}
