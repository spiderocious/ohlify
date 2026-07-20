import { AppText, colors, ProfessionalListTile } from '@ohlify/mobile-ui';
import { Fragment } from 'react';
import { View } from 'react-native';

import { fileService } from '@shared/services/file-service';

import type { Professional } from '@features/professionals/types/professional';

export interface SearchResultsListProps {
  professionals: Professional[];
  onTap: (pro: Professional) => void;
  onSchedule: (pro: Professional) => void;
}

/** Mirrors mobile/lib/features/professional_search/screen/parts/search_results_list.dart. */
export function SearchResultsList({ professionals, onTap, onSchedule }: SearchResultsListProps) {
  if (professionals.length === 0) {
    return (
      <View style={{ paddingVertical: 48 }}>
        <AppText variant="body" color={colors.textMuted} align="center">
          No professionals match your search.
        </AppText>
      </View>
    );
  }

  return (
    <View>
      {professionals.map((pro, i) => (
        <Fragment key={pro.id}>
          {i > 0 ? <View style={{ height: 12 }} /> : null}
          <ProfessionalListTile
            name={pro.name}
            role={pro.role}
            rating={pro.rating}
            reviewCount={pro.reviewCount}
            avatarKey={pro.avatarUrl}
            resolveUri={fileService.mintViewUri}
            onSchedule={() => onSchedule(pro)}
            onPress={() => onTap(pro)}
          />
        </Fragment>
      ))}
    </View>
  );
}
