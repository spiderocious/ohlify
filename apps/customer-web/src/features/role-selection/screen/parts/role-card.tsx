import { IconCheck, type LucideIcon } from '@icons';
import { Repeat } from 'meemaw';

import { AppText, cn } from '@ohlify/ui';

interface RoleCardProps {
  title: string;
  subtitle: string;
  bullets: ReadonlyArray<string>;
  Icon: LucideIcon;
  selected: boolean;
  onTap: () => void;
}

/** Mirrors mobile/lib/features/role_selection/screen/parts/role_card.dart. */
export function RoleCard({ title, subtitle, bullets, Icon, selected, onTap }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-[20px] border p-5 text-left transition-all duration-200 ease-out',
        selected
          ? 'border-[1.5px] border-primary bg-surface-dark'
          : 'border-border bg-background',
      )}
    >
      <div className="flex items-center gap-3.5">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-[14px]',
            selected ? 'bg-primary' : 'bg-surface-dark',
          )}
        >
          <Icon size={22} color={selected ? '#fff' : 'var(--ohl-primary)'} />
        </div>
        <div className="flex-1">
          <AppText variant="medium" weight={700} align="start" color="var(--ohl-text-jet)">
            {title}
          </AppText>
        </div>
        <Radio selected={selected} />
      </div>

      <div className="mt-3">
        <AppText variant="body" align="start" color="var(--ohl-text-muted)">
          {subtitle}
        </AppText>
      </div>

      <div className="mt-3.5 space-y-2">
        <Repeat each={bullets as string[]}>
          {(text) => (
            <div key={text} className="flex items-start gap-2.5">
              <span className="mt-1.5">
                <IconCheck size={14} color="var(--ohl-primary)" />
              </span>
              <AppText variant="body" align="start" color="var(--ohl-text-charcoal)">
                {text}
              </AppText>
            </div>
          )}
        </Repeat>
      </div>
    </button>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <div
      className={cn(
        'flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-colors',
        selected ? 'border-primary bg-primary text-white' : 'border-border bg-transparent',
      )}
    >
      {selected ? <IconCheck size={14} color="#fff" /> : null}
    </div>
  );
}
