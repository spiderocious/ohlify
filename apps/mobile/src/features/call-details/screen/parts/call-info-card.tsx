import { AppIcon, AppText, colors, type AppIconName } from '@ohlify/mobile-ui';
import { Fragment } from 'react';
import { View } from 'react-native';

import type { CallDetail } from '@shared/types/call-detail';

export interface CallInfoCardProps {
  call: CallDetail;
}

/** Mirrors mobile/lib/features/call_details/screen/parts/call_info_card.dart. */
export function CallInfoCard({ call }: CallInfoCardProps) {
  const rows: { icon: AppIconName; label: string; value: string }[] = [
    { icon: call.callType === 'video' ? 'video' : 'phone', label: 'Call type', value: call.callType === 'video' ? 'Video call' : 'Audio call' },
    { icon: 'calendarToday', label: 'Date', value: call.date },
    { icon: 'accessTime', label: 'Time', value: call.time },
    { icon: 'timer', label: 'Duration', value: call.duration },
    ...(call.amount ? [{ icon: 'receiptLong' as AppIconName, label: 'Amount', value: call.amount }] : []),
  ];

  return (
    <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 20 }}>
      {rows.map((row, i) => (
        <Fragment key={row.label}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppIcon name={row.icon} size={18} color={colors.textMuted} />
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <AppText variant="body" color={colors.textMuted} align="left">
                {row.label}
              </AppText>
            </View>
            <AppText variant="body" color={colors.textJet} weight="600" align="right">
              {row.value}
            </AppText>
          </View>
        </Fragment>
      ))}
    </View>
  );
}
