import { AppSearchBar, AppText, colors } from '@ohlify/mobile-ui';
import { Pressable, ScrollView, View } from 'react-native';

export const CallStatusFilter = {
  ALL: 'all',
  COMPLETED: 'completed',
  MISSED: 'missed',
  CANCELLED: 'cancelled',
} as const;

export type CallStatusFilter = (typeof CallStatusFilter)[keyof typeof CallStatusFilter];

export const CallRangeFilter = {
  ALL: 'all',
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
} as const;

export type CallRangeFilter = (typeof CallRangeFilter)[keyof typeof CallRangeFilter];

const STATUS_LABELS: Record<CallStatusFilter, string> = {
  [CallStatusFilter.ALL]: 'All',
  [CallStatusFilter.COMPLETED]: 'Completed',
  [CallStatusFilter.MISSED]: 'Missed',
  [CallStatusFilter.CANCELLED]: 'Cancelled',
};

const RANGE_LABELS: Record<CallRangeFilter, string> = {
  [CallRangeFilter.ALL]: 'Any time',
  [CallRangeFilter.TODAY]: 'Today',
  [CallRangeFilter.WEEK]: 'This week',
  [CallRangeFilter.MONTH]: 'This month',
};

export interface CallFilterBarProps {
  peerQuery: string;
  status: CallStatusFilter;
  range: CallRangeFilter;
  onPeerQuery: (value: string) => void;
  onStatus: (value: CallStatusFilter) => void;
  onRange: (value: CallRangeFilter) => void;
}

/**
 * Filters for a professional's call log.
 *
 * A professional taking calls all day needs to find one call — "who was that
 * client on Tuesday" — which an infinite reverse-chronological list cannot
 * answer. Clients, who have a handful of calls, get no filters at all.
 */
export function CallFilterBar(props: CallFilterBarProps) {
  return (
    <View>
      <AppSearchBar
        placeholder="Search by name"
        value={props.peerQuery}
        onChangeText={props.onPeerQuery}
      />
      <View style={{ height: 10 }} />
      <ChipRow
        values={Object.values(CallStatusFilter)}
        labels={STATUS_LABELS}
        selected={props.status}
        onSelect={props.onStatus}
      />
      <View style={{ height: 8 }} />
      <ChipRow
        values={Object.values(CallRangeFilter)}
        labels={RANGE_LABELS}
        selected={props.range}
        onSelect={props.onRange}
      />
    </View>
  );
}

function ChipRow<T extends string>({
  values,
  labels,
  selected,
  onSelect,
}: {
  values: readonly T[];
  labels: Record<T, string>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {values.map((value) => {
        const isSelected = value === selected;
        return (
          <Pressable key={value} onPress={() => onSelect(value)}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                marginRight: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary : colors.surface,
              }}
            >
              <AppText
                variant="bodySmall"
                weight="600"
                color={isSelected ? colors.textWhite : colors.textSlate}
              >
                {labels[value]}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
