import { AppIcon, colors } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

export interface StarRowProps {
  value: number;
  onChange: (value: number) => void;
}

const AMBER = '#F5A623';

/** Mirrors _StarRow in mobile/lib/features/call_session/screen/call_rating_screen.dart. */
export function StarRow({ value, onChange }: StarRowProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} style={{ paddingHorizontal: 6 }}>
          <AppIcon name="star" size={40} color={i <= value ? AMBER : colors.border} />
        </Pressable>
      ))}
    </View>
  );
}
