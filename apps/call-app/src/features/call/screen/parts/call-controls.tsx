interface Props {
  muted: boolean;
  cameraEnabled: boolean;
  callType: 'audio' | 'video';
  onMute: () => void;
  onCamera: () => void;
  onSwitchCamera: () => void;
  onHangup: () => void;
}

function ControlBtn({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={[
        'flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors',
        danger
          ? 'bg-red-600 hover:bg-red-700'
          : active
            ? 'bg-zinc-500 hover:bg-zinc-400'
            : 'bg-zinc-700 hover:bg-zinc-600',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function CallControls({
  muted,
  cameraEnabled,
  callType,
  onMute,
  onCamera,
  onSwitchCamera,
  onHangup,
}: Props) {
  return (
    <div className="flex items-center gap-6 justify-center">
      <ControlBtn label={muted ? 'Unmute' : 'Mute'} active={muted} onClick={onMute}>
        {muted ? (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3 3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        )}
      </ControlBtn>

      {callType === 'video' && (
        <>
          <ControlBtn
            label={cameraEnabled ? 'Disable camera' : 'Enable camera'}
            active={!cameraEnabled}
            onClick={onCamera}
          >
            {cameraEnabled ? (
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M21 6.5l-4-4-15 15 1.41 1.41L5 17.17V18c0 .55.45 1 1 1h11.17l3.42 3.41L21 21 21 6.5zm-3.83 10.83L8 8.33V7h.17L18 16.83l-.83.5zM3.27 3 2 4.27 4.73 7H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.19 0 .35-.08.48-.18L19.73 22 21 20.73 3.27 3z" />
              </svg>
            )}
          </ControlBtn>

          <ControlBtn label="Switch camera" onClick={onSwitchCamera}>
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
              <path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zM12 7c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zm0 2l-1.25 2.25H9L11 12l-2 1.75h1.75L12 16l1.25-2.25H15L13 12l2-1.75h-1.75L12 9z" />
            </svg>
          </ControlBtn>
        </>
      )}

      <ControlBtn label="End call" danger onClick={onHangup}>
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current rotate-[135deg]">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
        </svg>
      </ControlBtn>
    </div>
  );
}
