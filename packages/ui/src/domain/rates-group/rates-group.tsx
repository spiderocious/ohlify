import { IconClock, IconDelete } from '@icons';
import { Repeat } from 'meemaw';
import type { CSSProperties } from 'react';

import type { CallRate, CallType } from '@ohlify/core';

import { AppIconButton } from '../../primitives/app-icon-button/app-icon-button.js';
import { AppText } from '../../primitives/app-text/app-text.js';

interface RatesGroupProps {
  callType: CallType;
  rates: ReadonlyArray<CallRate>;
  onDelete: (rate: CallRate) => void;
}

/** 1:1 with mobile/lib/ui/widgets/rates_group/rates_group.dart (editable variant). */
export function RatesGroup({ callType, rates, onDelete }: RatesGroupProps) {
  const isAudio = callType === 'audio';
  const accent: string = isAudio ? '#E8F5E9' : 'var(--ohl-background)';
  const textColor: string = isAudio ? '#1F6F15' : 'var(--ohl-text-jet)';

  const containerStyle: CSSProperties = {
    backgroundColor: accent,
    borderRadius: 16,
    border: '1px solid var(--ohl-border)',
  };

  return (
    <div className="flex flex-col font-sans">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        {isAudio ? 'Audio call' : 'Video call'}
      </AppText>
      <div className="mt-2.5 overflow-hidden" style={containerStyle}>
        <Repeat each={[...rates]}>
          {(rate, i) => (
            <div key={rate.id} className={i > 0 ? 'border-t border-border' : ''}>
              <div className="flex items-center px-4 py-3.5">
                <IconClock size={20} color={textColor} />
                <span className="ml-3 flex-1">
                  <AppText variant="body" align="start" color={textColor} weight={500}>
                    {rate.durationMinutes} minutes
                  </AppText>
                </span>
                <AppText variant="body" align="end" color={textColor} weight={600}>
                  {rate.price}
                </AppText>
                <span className="ml-2.5">
                  <AppIconButton
                    icon={<IconDelete color="var(--ohl-danger)" size={18} />}
                    shape="squircle"
                    backgroundColor="#FDECEA"
                    size={36}
                    iconSize={18}
                    onPressed={() => onDelete(rate)}
                    ariaLabel="Delete rate"
                  />
                </span>
              </div>
            </div>
          )}
        </Repeat>
      </div>
    </div>
  );
}
