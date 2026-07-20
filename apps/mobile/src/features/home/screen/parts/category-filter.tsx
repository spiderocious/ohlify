import { AppText, colors } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { CategoryItem } from '@features/home/types/home-models';

/** Mirrors mobile/lib/features/home/screen/parts/category_filter.dart. */
export interface CategoryFilterProps {
  categories: CategoryItem[];
  onChange: (category: CategoryItem) => void;
}

export function CategoryFilter({ categories, onChange }: CategoryFilterProps) {
  const [selected, setSelected] = useState(categories[0]?.value);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row' }}>
        {categories.map((cat, i) => (
          <View key={cat.value} style={{ marginRight: i < categories.length - 1 ? 8 : 0 }}>
            <Pressable
              onPress={() => {
                setSelected(cat.value);
                onChange(cat);
              }}
            >
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 100,
                  backgroundColor: cat.value === selected ? colors.primary : colors.secondary,
                }}
              >
                <AppText variant="body" color={cat.value === selected ? colors.textWhite : colors.primary} weight="500" align="center">
                  {cat.label}
                </AppText>
              </View>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
