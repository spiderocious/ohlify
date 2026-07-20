import { AppText, colors, ProfessionalListTile } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

import { fileService } from '@shared/services/file-service';

import type { ProfessionalListItem } from '@features/home/types/home-models';

/** Mirrors mobile/lib/features/home/screen/parts/popular_professionals_list.dart. */
export interface PopularProfessionalsListProps {
  professionals: ProfessionalListItem[];
  onViewAll: () => void;
  onSchedule: (pro: ProfessionalListItem) => void;
  onPress: (pro: ProfessionalListItem) => void;
}

export function PopularProfessionalsList({ professionals, onViewAll, onSchedule, onPress }: PopularProfessionalsListProps) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="body" color={colors.textMuted} align="left">
          Popular people
        </AppText>
        <Pressable onPress={onViewAll}>
          <AppText variant="body" color={colors.textBlack} weight="500" align="left">
            View all
          </AppText>
        </Pressable>
      </View>
      <View style={{ height: 16 }} />
      {professionals.map((pro, i) => (
        <View key={pro.id} style={{ marginTop: i > 0 ? 12 : 0 }}>
          <ProfessionalListTile
            name={pro.name}
            role={pro.role}
            rating={pro.rating}
            reviewCount={pro.reviewCount}
            avatarKey={pro.avatarKey}
            resolveUri={fileService.mintViewUri}
            onSchedule={() => onSchedule(pro)}
            onPress={() => onPress(pro)}
          />
        </View>
      ))}
    </View>
  );
}
