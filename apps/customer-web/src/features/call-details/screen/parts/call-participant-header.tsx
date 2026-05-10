import { IconPhone, IconUser, IconVideo } from '@icons';

import type { CallDetail } from '@ohlify/core';
import { AppText, ProfessionalRating } from '@ohlify/ui';

/** Mirrors mobile/lib/features/call_details/screen/parts/call_participant_header.dart. */
export function CallParticipantHeader({ call }: { call: CallDetail }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface">
        <IconUser size={36} color="var(--ohl-text-muted)" />
      </div>
      <AppText variant="bodyTitle" weight={700} align="center" className="mt-3">
        {call.name}
      </AppText>
      <AppText variant="bodyNormal" align="center" color="var(--ohl-text-muted)" className="mt-0.5">
        {call.role}
      </AppText>
      <div className="mt-2 inline-flex items-center gap-2">
        <ProfessionalRating rating={call.rating} reviewCount={0} />
        <span className="font-sans text-xs text-text-muted">
          {call.callType === 'video' ? <IconVideo size={14} /> : <IconPhone size={14} />}
        </span>
      </div>
    </div>
  );
}
