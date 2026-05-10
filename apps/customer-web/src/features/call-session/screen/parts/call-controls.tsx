import {
  IconMic,
  IconMicOff,
  IconPhoneOff,
  IconVideo,
  IconVideoOff,
  IconVolume,
  IconVolumeOff,
  type LucideIcon,
} from '@icons';
import { Show } from 'meemaw';

import { cn } from '@ohlify/ui';

interface CallControlsProps {
  isVideo: boolean;
  muted: boolean;
  speakerOn: boolean;
  cameraEnabled: boolean;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera: () => void;
  onHangup: () => void;
}

/** Mirrors mobile call_controls_row + call_control_button. */
export function CallControls({
  isVideo,
  muted,
  speakerOn,
  cameraEnabled,
  onToggleMute,
  onToggleSpeaker,
  onToggleCamera,
  onHangup,
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <ControlButton
        Icon={muted ? IconMicOff : IconMic}
        active={muted}
        onPressed={onToggleMute}
        label={muted ? 'Unmute' : 'Mute'}
      />
      <Show when={isVideo}>
        <ControlButton
          Icon={cameraEnabled ? IconVideo : IconVideoOff}
          active={!cameraEnabled}
          onPressed={onToggleCamera}
          label={cameraEnabled ? 'Camera off' : 'Camera on'}
        />
      </Show>
      <ControlButton
        Icon={speakerOn ? IconVolume : IconVolumeOff}
        active={speakerOn}
        onPressed={onToggleSpeaker}
        label={speakerOn ? 'Speaker off' : 'Speaker on'}
      />
      <button
        type="button"
        onClick={onHangup}
        aria-label="End call"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-danger text-white shadow-lg"
      >
        <IconPhoneOff size={24} />
      </button>
    </div>
  );
}

interface ControlButtonProps {
  Icon: LucideIcon;
  active: boolean;
  onPressed: () => void;
  label: string;
}

function ControlButton({ Icon, active, onPressed, label }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onPressed}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-md',
        active ? 'bg-white text-text-jet' : 'bg-white/15 text-white',
      )}
    >
      <Icon size={20} />
    </button>
  );
}
