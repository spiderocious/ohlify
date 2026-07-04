import { PERMISSION_KIND, type PermissionKind } from '@shared/bridge/bridge.types.js';

interface Props {
  kind: PermissionKind;
}

export function PermissionErrorScreen({ kind }: Props) {
  const label = kind === PERMISSION_KIND.MICROPHONE ? 'microphone' : 'camera';
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-900/40 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-red-400">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white">
        {label.charAt(0).toUpperCase() + label.slice(1)} access needed
      </h2>
      <p className="text-sm text-zinc-400 max-w-xs">
        Please grant {label} access in your device settings, then retry.
      </p>
    </div>
  );
}
