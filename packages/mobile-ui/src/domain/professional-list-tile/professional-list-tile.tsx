import { Pressable, View } from 'react-native';

import { AppButton } from '../../primitives/app-button/app-button';
import { AppFilePreview } from '../../primitives/app-file-preview/app-file-preview';
import { AppText } from '../../primitives/app-text/app-text';
import { colors } from '../../theme/colors';
import { ProfessionalRating } from '../professional-rating/professional-rating';

/** 1:1 with mobile/lib/ui/widgets/professional_list_tile/professional_list_tile.dart. */
export interface ProfessionalListTileProps {
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  avatarKey?: string;
  resolveUri: (key: string) => Promise<string>;
  onSchedule?: () => void;
  onPress?: () => void;
}

export function ProfessionalListTile({
  name,
  role,
  rating,
  reviewCount,
  avatarKey,
  resolveUri,
  onSchedule,
  onPress,
}: ProfessionalListTileProps) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          padding: 16,
          backgroundColor: colors.background,
          borderRadius: 20,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <AppFilePreview
          fileKey={avatarKey}
          resolveUri={resolveUri}
          width={80}
          height={80}
          borderRadius={16}
        />
        <View style={{ width: 14 }} />
        <View style={{ flex: 1 }}>
          <AppText
            variant="body"
            color={colors.textBlack}
            align="left"
            weight="500"
            numberOfLines={1}
          >
            {name}
          </AppText>
          <View style={{ height: 4 }} />
          <AppText variant="bodyNormal" color={colors.textMuted} align="left" numberOfLines={1}>
            {role}
          </AppText>
          <View style={{ height: 10 }} />
          <ProfessionalRating rating={rating} reviewCount={reviewCount} showDivider />
        </View>
        <View style={{ width: 12 }} />
        <AppButton
          label="Schedule call"
          onPress={onSchedule}
          radius={100}
          width={100}
          height={32}
          textStyle={{ fontSize: 10, fontWeight: '500' }}
        />
      </View>
    </Pressable>
  );
}
