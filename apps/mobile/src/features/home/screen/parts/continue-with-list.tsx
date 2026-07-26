import { formatSecondsAsDuration } from '@ohlify/core';
import { AppAvatar, AppText, colors } from '@ohlify/mobile-ui';
import { Pressable, ScrollView, View } from 'react-native';

import { fileService } from '@shared/services/file-service';

import type { ContinueWithItem } from '../../types/home-models';

export interface ContinueWithListProps {
  items: ContinueWithItem[];
  onPress: (item: ContinueWithItem) => void;
}

/**
 * Professionals this client still holds time with.
 *
 * Leads the client home because a returning client's job is "get back to my
 * pro" — they have already chosen and already paid. Discovery is for the people
 * who have not, and it sits below this.
 */
export function ContinueWithList({ items, onPress }: ContinueWithListProps) {
  if (items.length === 0) return null;

  return (
    <View>
      <AppText variant="body" weight="700" color={colors.textJet} align="left">
        Pick up where you left off
      </AppText>
      <View style={{ height: 10 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((item, index) => (
          <Pressable key={`${item.professionalId}-${item.callType}`} onPress={() => onPress(item)}>
            <View
              style={{
                width: 150,
                marginRight: index === items.length - 1 ? 0 : 12,
                padding: 14,
                borderRadius: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <AppAvatar
                fileKey={item.avatarKey}
                resolveUri={fileService.mintViewUri}
                name={item.name ?? 'Professional'}
                size={44}
              />
              <View style={{ height: 10 }} />
              <AppText
                variant="body"
                weight="600"
                color={colors.textJet}
                align="left"
                numberOfLines={1}
              >
                {item.name ?? 'Professional'}
              </AppText>
              {item.occupation ? (
                <AppText
                  variant="bodySmall"
                  color={colors.textMuted}
                  align="left"
                  numberOfLines={1}
                >
                  {item.occupation}
                </AppText>
              ) : null}
              <View style={{ height: 8 }} />
              {/* The balance is the reason this card exists — it is what makes
                  the professional worth returning to. */}
              <AppText variant="bodySmall" weight="600" color={colors.primary} align="left">
                {`${formatSecondsAsDuration(item.secondsRemaining)} left`}
              </AppText>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
