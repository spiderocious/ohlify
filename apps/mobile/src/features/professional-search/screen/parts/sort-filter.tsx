import { AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { Fragment } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

export type SortKey = 'rating' | 'price' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  key: SortKey;
  direction: SortDirection;
}

export interface SortFilterProps {
  value: SortOption;
  onChange: (option: SortOption) => void;
}

const SORT_KEYS: SortKey[] = ['rating', 'price', 'name'];
const LABELS: Record<SortKey, string> = { rating: 'Rating', price: 'Price', name: 'Name' };
const DEFAULT_DIRECTION: Record<SortKey, SortDirection> = { rating: 'desc', price: 'asc', name: 'asc' };

/** Mirrors mobile/lib/features/professional_search/screen/parts/sort_filter.dart. */
export function SortFilter({ value, onChange }: SortFilterProps) {
  function handleTap(key: SortKey) {
    if (value.key === key) {
      onChange({ key, direction: value.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      onChange({ key, direction: DEFAULT_DIRECTION[key] });
    }
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row' }}>
        {SORT_KEYS.map((key) => (
          <Fragment key={key}>
            <SortChip label={LABELS[key]} isSelected={value.key === key} direction={value.key === key ? value.direction : undefined} onTap={() => handleTap(key)} />
            <View style={{ width: 8 }} />
          </Fragment>
        ))}
      </View>
    </ScrollView>
  );
}

function SortChip({ label, isSelected, direction, onTap }: { label: string; isSelected: boolean; direction?: SortDirection; onTap: () => void }) {
  return (
    <Pressable onPress={onTap}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 100,
          backgroundColor: isSelected ? colors.primary : colors.secondary,
        }}
      >
        <AppText variant="body" color={isSelected ? colors.textWhite : colors.primary} weight="500" align="center">
          {label}
        </AppText>
        {isSelected && direction ? (
          <>
            <View style={{ width: 6 }} />
            <AppIcon name={direction === 'asc' ? 'arrowUpward' : 'arrowDownward'} size={14} color={colors.textWhite} />
          </>
        ) : null}
      </View>
    </Pressable>
  );
}
