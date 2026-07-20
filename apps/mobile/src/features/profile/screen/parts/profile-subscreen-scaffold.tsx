import { useNavigation } from '@react-navigation/native';
import { AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

export interface ProfileSubscreenScaffoldProps {
  title: string;
  body: ReactNode;
  bottom?: ReactNode;
  paddingHorizontal?: number;
  backgroundColor?: string;
}

/** Mirrors mobile/lib/features/profile/screen/parts/profile_subscreen_scaffold.dart. */
export function ProfileSubscreenScaffold({ title, body, bottom, paddingHorizontal = 20, backgroundColor = colors.background }: ProfileSubscreenScaffoldProps) {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppIcon name="chevronLeft" size={22} color={colors.textJet} />
          <View style={{ width: 4 }} />
          <AppText variant="body" color={colors.textJet} weight="500" align="left">
            Back
          </AppText>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal, paddingTop: 4, paddingBottom: 12 }}>
        <AppText variant="title" color={colors.textJet} weight="800" align="left">
          {title}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal, paddingBottom: bottom ? 16 : 24 }} style={{ flex: 1 }}>
        {body}
      </ScrollView>
      {bottom ? <View style={{ paddingHorizontal, paddingTop: 8, paddingBottom: 16 }}>{bottom}</View> : null}
    </View>
  );
}
