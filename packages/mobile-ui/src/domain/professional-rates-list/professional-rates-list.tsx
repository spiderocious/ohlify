import { Fragment } from 'react';
import { View } from 'react-native';

import { AppText } from '../../primitives/app-text/app-text';
import { AppSvg } from '../../icons';
import { colors } from '../../theme/colors';

export interface ProfessionalRatesListRate {
  callType: 'audio' | 'video';
  durationMinutes: number;
  price: string;
  pricePerMinute?: string;
}

export interface ProfessionalRatesListProps {
  rates: ProfessionalRatesListRate[];
}

/** 1:1 with mobile/lib/ui/widgets/professional_rates_list/professional_rates_list.dart. */
export function ProfessionalRatesList({ rates }: ProfessionalRatesListProps) {
  const audio = rates.filter((r) => r.callType === 'audio');
  const video = rates.filter((r) => r.callType === 'video');

  return (
    <View>
      {audio.length > 0 ? (
        <>
          <RateGroup title="Audio call" rates={audio} backgroundColor="#ECFDF3" />
          <View style={{ height: 16 }} />
        </>
      ) : null}
      {video.length > 0 ? (
        <RateGroup title="Video call" rates={video} backgroundColor={colors.surfaceLight} />
      ) : null}
    </View>
  );
}

function RateGroup({
  title,
  rates,
  backgroundColor,
}: {
  title: string;
  rates: ProfessionalRatesListRate[];
  backgroundColor: string;
}) {
  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        {title}
      </AppText>
      <View style={{ height: 10 }} />
      <View style={{ backgroundColor, borderRadius: 16 }}>
        {rates.map((rate, i) => (
          <Fragment key={`${rate.durationMinutes}-${i}`}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
            <RateRow rate={rate} />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function RateRow({ rate }: { rate: ProfessionalRatesListRate }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <AppSvg name="stopwatch" size={20} />
      <View style={{ width: 10 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textJet} weight="500" align="left">
          {`${rate.durationMinutes} minutes`}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="body" color={colors.textForest} weight="700" align="right">
          {rate.price}
        </AppText>
        {rate.pricePerMinute ? (
          <AppText variant="bodySmall" color={colors.textMuted} align="right">
            {rate.pricePerMinute}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
