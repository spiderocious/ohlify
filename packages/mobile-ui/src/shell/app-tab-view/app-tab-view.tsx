import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '../../primitives/app-text/app-text';
import { colors } from '../../theme/colors';

export interface AppTabItem {
  label: string;
  child: ReactNode;
}

export interface AppTabViewProps {
  tabs: AppTabItem[];
}

/**
 * Mirrors mobile/lib/ui/widgets/app_tab_view/app_tab_view.dart.
 * RN has no IndexedStack, so state is preserved by rendering every tab's
 * body and toggling visibility with `display: none` on the inactive ones.
 */
export function AppTabView({ tabs }: AppTabViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View style={{ alignItems: 'stretch' }}>
      <TabBar tabs={tabs.map((t) => t.label)} activeIndex={activeIndex} onTap={setActiveIndex} />
      <View style={{ height: 16 }} />
      {tabs.map((tab, i) => (
        <View key={tab.label} style={i === activeIndex ? undefined : { display: 'none' }}>
          {tab.child}
        </View>
      ))}
    </View>
  );
}

function TabBar({
  tabs,
  activeIndex,
  onTap,
}: {
  tabs: string[];
  activeIndex: number;
  onTap: (i: number) => void;
}) {
  return (
    <View
      style={{ flexDirection: 'row', padding: 4, backgroundColor: colors.border, borderRadius: 14 }}
    >
      {tabs.map((label, i) => {
        const active = i === activeIndex;
        return (
          <Pressable key={label} style={{ flex: 1 }} onPress={() => onTap(i)}>
            <View
              style={{
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: active ? colors.background : 'transparent',
                shadowColor: '#000',
                shadowOpacity: active ? 0.06 : 0,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: active ? 2 : 0,
              }}
            >
              <AppText
                variant="body"
                color={active ? colors.textJet : colors.textMuted}
                weight={active ? '700' : '400'}
                align="center"
              >
                {label}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
