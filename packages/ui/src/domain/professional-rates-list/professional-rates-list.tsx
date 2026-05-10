import { Repeat, Show } from 'meemaw';
import type { CSSProperties } from 'react';

import type { ProfessionalRate } from '@ohlify/core';

import { IconClock } from '@icons';

import { AppText } from '../../primitives/app-text/app-text.js';

interface ProfessionalRatesListProps {
  rates: ReadonlyArray<ProfessionalRate>;
  /** Optional. When provided, each row becomes a button that emits the rate. */
  onSelect?: (rate: ProfessionalRate) => void;
}

/** 1:1 with mobile/lib/ui/widgets/professional_rates_list/professional_rates_list.dart. */
export function ProfessionalRatesList({ rates, onSelect }: ProfessionalRatesListProps) {
  const audio = rates.filter((r) => r.callType === 'audio');
  const video = rates.filter((r) => r.callType === 'video');

  return (
    <div className="flex flex-col gap-4 font-sans">
      <Show when={audio.length > 0}>
        <RateGroup title="Audio call" rates={audio} background="#ECFDF3" onSelect={onSelect} />
      </Show>
      <Show when={video.length > 0}>
        <RateGroup
          title="Video call"
          rates={video}
          background="var(--ohl-surface-light)"
          onSelect={onSelect}
        />
      </Show>
    </div>
  );
}

interface RateGroupProps {
  title: string;
  rates: ReadonlyArray<ProfessionalRate>;
  background: string;
  onSelect?: (rate: ProfessionalRate) => void;
}

function RateGroup({ title, rates, background, onSelect }: RateGroupProps) {
  const style: CSSProperties = {
    backgroundColor: background,
    borderRadius: 16,
  };
  return (
    <div className="flex flex-col">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        {title}
      </AppText>
      <div className="mt-2.5 overflow-hidden" style={style}>
        <Repeat each={[...rates]}>
          {(rate, i) => {
            const inner = (
              <div className="flex items-center px-4 py-3.5">
                <IconClock size={20} color="var(--ohl-text-jet)" />
                <span className="ml-2.5 flex-1">
                  <AppText variant="body" align="start" color="var(--ohl-text-jet)" weight={500}>
                    {rate.durationMinutes} minutes
                  </AppText>
                </span>
                <AppText variant="body" align="end" color="var(--ohl-text-forest)" weight={700}>
                  {rate.price}
                </AppText>
              </div>
            );
            const className = i > 0 ? 'border-t border-border' : '';
            const key = `${rate.callType}-${rate.durationMinutes}-${i}`;
            return onSelect ? (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(rate)}
                className={`block w-full text-left transition hover:bg-black/[0.03] ${className}`}
              >
                {inner}
              </button>
            ) : (
              <div key={key} className={className}>
                {inner}
              </div>
            );
          }}
        </Repeat>
      </div>
    </div>
  );
}
