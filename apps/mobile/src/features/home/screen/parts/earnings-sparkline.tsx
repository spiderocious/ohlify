import { AppText, colors } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

import type { ProSeriesPoint } from '../../api/use-pro-dashboard';

export interface EarningsSparklineProps {
  series: ProSeriesPoint[];
  days: 7 | 30;
  onDaysChange: (days: 7 | 30) => void;
}

/**
 * Calls, talk time, and earnings — the minimum a professional needs to see a
 * trend.
 *
 * Bars rather than a line: the data is per-day and sparse, and a line through
 * three points implies a continuity that is not there. Message analytics are
 * deliberately absent — professionals will not act on them, and computing them
 * correctly costs far more than the insight is worth.
 */
export function EarningsSparkline({ series, days, onDaysChange }: EarningsSparklineProps) {
  const peak = Math.max(1, ...series.map((p) => p.earnedKobo));
  const totalCalls = series.reduce((sum, p) => sum + p.calls, 0);
  const totalMinutes = Math.floor(series.reduce((sum, p) => sum + p.seconds, 0) / 60);

  return (
    <View style={{ padding: 18, borderRadius: 18, backgroundColor: colors.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <AppText variant="bodySmall" weight="600" color={colors.textSlate} align="left">
          Activity
        </AppText>
        <View style={{ flex: 1 }} />
        {([7, 30] as const).map((option) => (
          <Pressable key={option} onPress={() => onDaysChange(option)}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                marginLeft: 6,
                backgroundColor: days === option ? colors.primary : colors.background,
              }}
            >
              <AppText
                variant="bodySmall"
                weight="600"
                color={days === option ? colors.textWhite : colors.textMuted}
              >
                {`${option}d`}
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 14 }} />

      {series.length === 0 ? (
        <AppText variant="bodySmall" color={colors.textMuted} align="left">
          No calls in this period yet.
        </AppText>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 4 }}>
            {series.map((point) => (
              <View
                key={point.day}
                style={{
                  flex: 1,
                  // Floors at 3px so a day with a tiny amount still reads as a
                  // day with something, not an empty slot.
                  height: Math.max(3, (point.earnedKobo / peak) * 56),
                  borderRadius: 3,
                  backgroundColor: colors.primary,
                }}
              />
            ))}
          </View>
          <View style={{ height: 10 }} />
          <AppText variant="bodySmall" color={colors.textMuted} align="left">
            {`${totalCalls} ${totalCalls === 1 ? 'call' : 'calls'} · ${totalMinutes} min talked`}
          </AppText>
        </>
      )}
    </View>
  );
}
