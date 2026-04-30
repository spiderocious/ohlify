import { useState, type ReactNode } from 'react';

import { cn } from '../../utils/cn.js';

export interface AppTabItem {
  label: string;
  child: ReactNode;
}

interface AppTabViewProps {
  tabs: AppTabItem[];
  /** Controlled active index. When undefined the component is uncontrolled. */
  activeIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
}

/**
 * Mirrors mobile AppTabView. Pill-tab bar inside a border container; the
 * active tab gets a white pill with shadow. Children are kept in an
 * IndexedStack-equivalent (all rendered, only active visible) to preserve
 * each tab's state across switches.
 */
export function AppTabView({ tabs, activeIndex, onChange, className }: AppTabViewProps) {
  const [internal, setInternal] = useState(0);
  const active = activeIndex ?? internal;

  const select = (i: number) => {
    if (activeIndex === undefined) setInternal(i);
    onChange?.(i);
  };

  return (
    <div className={cn('flex w-full flex-col font-sans', className)}>
      <div
        className="flex gap-1 rounded-[14px] p-1"
        style={{ backgroundColor: 'var(--ohl-border)' }}
      >
        {tabs.map((t, i) => {
          const isActive = i === active;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => select(i)}
              className={cn(
                'flex-1 rounded-[10px] px-4 py-3 text-sm transition-all duration-180 ease-out',
                isActive
                  ? 'bg-background font-bold text-text-jet shadow-[0_2px_8px_rgb(0_0_0_/_0.06)]'
                  : 'font-normal text-text-muted',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col">
        {tabs.map((t, i) => (
          <div key={t.label} className={i === active ? 'block' : 'hidden'}>
            {t.child}
          </div>
        ))}
      </div>
    </div>
  );
}
