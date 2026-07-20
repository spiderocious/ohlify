import { AppAvatar, AppTag, AppText, colors, ProfessionalRating } from '@ohlify/mobile-ui';
import { View } from 'react-native';

import { fileService } from '@shared/services/file-service';
import type { CallDetail, CallStatus } from '@shared/types/call-detail';

export interface CallParticipantHeaderProps {
  call: CallDetail;
}

const STATUS_LABEL: Record<CallStatus, string> = { upcoming: 'UPCOMING', completed: 'COMPLETED', missed: 'MISSED' };
const STATUS_COLOR: Record<CallStatus, string> = { upcoming: colors.primary, completed: colors.success, missed: colors.danger };

/** Mirrors mobile/lib/features/call_details/screen/parts/call_participant_header.dart. */
export function CallParticipantHeader({ call }: CallParticipantHeaderProps) {
  return (
    <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 20 }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          <AppAvatar fileKey={call.avatarKey} resolveUri={fileService.mintViewUri} name={call.name} size={72} />
        </View>
        <View style={{ width: 14 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="header" color={colors.textJet} weight="700" align="left" numberOfLines={1}>
            {call.name}
          </AppText>
          <View style={{ height: 4 }} />
          <AppText variant="body" color={colors.textMuted} align="left" numberOfLines={1}>
            {call.role}
          </AppText>
          <View style={{ height: 8 }} />
          <ProfessionalRating rating={call.rating} reviewCount={0} showDivider={false} />
        </View>
      </View>
      <View style={{ height: 14 }} />
      <AppTag label={STATUS_LABEL[call.status]} variant="solid" color={STATUS_COLOR[call.status]} size="small" />
    </View>
  );
}
