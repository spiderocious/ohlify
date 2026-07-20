import type { CallType } from '@ohlify/core';
import { View } from 'react-native';

import { AppIcon } from '../../icons/app-icons';
import { AppIconButton } from '../../primitives/app-icon-button/app-icon-button';
import { AppText } from '../../primitives/app-text/app-text';
import { colors } from '../../theme/colors';
import type { AddedRate } from '../add-rate-form/add-rate-form';

/** 1:1 with mobile/lib/ui/widgets/rates_group/rates_group.dart. */
export interface RatesGroupRate extends AddedRate {
  id: string;
  /** Display-formatted per-minute price, if the backend supplied one. */
  pricePerMinute?: string;
}

export interface RatesGroupProps {
  callType: CallType;
  rates: RatesGroupRate[];
  onDelete: (rate: RatesGroupRate) => void;
  /** When provided, each row also shows an edit affordance. PATCH /me/rates/{id} only allows updating price. */
  onEdit?: (rate: RatesGroupRate) => void;
}

export function RatesGroup({ callType, rates, onDelete, onEdit }: RatesGroupProps) {
  const title = callType === 'audio' ? 'Audio call' : 'Video call';
  const accent = callType === 'audio' ? '#E8F5E9' : colors.background;
  const textColor = callType === 'audio' ? '#1F6F15' : colors.textJet;

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        {title}
      </AppText>
      <View style={{ height: 10 }} />
      <View
        style={{
          backgroundColor: accent,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {rates.map((rate, i) => (
          <View key={rate.id}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
            <Row
              rate={rate}
              textColor={textColor}
              iconColor={textColor}
              onDelete={() => onDelete(rate)}
              onEdit={onEdit ? () => onEdit(rate) : undefined}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function Row({
  rate,
  textColor,
  iconColor,
  onDelete,
  onEdit,
}: {
  rate: RatesGroupRate;
  textColor: string;
  iconColor: string;
  onDelete: () => void;
  onEdit?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingLeft: 16,
        paddingRight: 12,
      }}
    >
      <AppIcon name="clock" size={20} color={iconColor} />
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={textColor} weight="500" align="left">
          {`${rate.durationMinutes} minutes`}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="body" color={textColor} weight="600" align="right">
          {rate.price}
        </AppText>
        {rate.pricePerMinute ? (
          <AppText variant="bodySmall" color={colors.textMuted} align="right">
            {rate.pricePerMinute}
          </AppText>
        ) : null}
      </View>
      {onEdit ? (
        <>
          <View style={{ width: 8 }} />
          <AppIconButton
            icon={<AppIcon name="edit" size={18} color={colors.primary} />}
            shape="squircle"
            backgroundColor="#EEF0FF"
            size={36}
            onPress={onEdit}
          />
        </>
      ) : null}
      <View style={{ width: 8 }} />
      <AppIconButton
        icon={<AppIcon name="delete" size={18} color={colors.danger} />}
        shape="squircle"
        backgroundColor="#FDECEA"
        size={36}
        onPress={onDelete}
      />
    </View>
  );
}
