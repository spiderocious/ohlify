import { ProfessionalHeader } from '@ohlify/mobile-ui';

import { fileService } from '@shared/services/file-service';

import type { Professional } from '@features/professionals/types/professional';

export interface ScheduleCallHeaderProps {
  professional: Professional;
  onBack: () => void;
}

/** Mirrors mobile/lib/features/schedule_call/screen/parts/schedule_call_header.dart. */
export function ScheduleCallHeader({ professional, onBack }: ScheduleCallHeaderProps) {
  return <ProfessionalHeader professional={professional} resolveUri={fileService.mintViewUri} onBack={onBack} />;
}
