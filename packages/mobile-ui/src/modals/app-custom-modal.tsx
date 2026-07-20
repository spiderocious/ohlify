import { Dimensions, ScrollView, View } from 'react-native';

import { AppIconButton } from '../primitives/app-icon-button/app-icon-button';
import { AppText } from '../primitives/app-text/app-text';
import { AppIcon } from '../icons/app-icons';
import { colors } from '../theme/colors';
import type { CustomModalEntry } from './modal-store';

/**
 * Renders a CustomModalEntry: title bar + close button + divider + body.
 * 1:1 with mobile/lib/ui/widgets/app_custom_modal/app_custom_modal.dart.
 * The body comes from the entry's builder function.
 */
export function AppCustomModal({
  entry,
  onDismiss,
}: {
  entry: CustomModalEntry;
  onDismiss: () => void;
}) {
  const isFullscreen = entry.options.position === 'fullscreen';
  const screenHeight = Dimensions.get('window').height;

  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: isFullscreen ? 0 : 20,
        height: isFullscreen ? screenHeight : undefined,
        marginHorizontal: isFullscreen ? 0 : 16,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText
            variant="medium"
            color={colors.textJet}
            weight="700"
            align="left"
            numberOfLines={1}
          >
            {entry.title}
          </AppText>
        </View>
        {entry.options.showCloseButton ? (
          <AppIconButton
            icon={<AppIcon name="close" size={18} color={colors.textJet} />}
            shape="squircle"
            backgroundColor={colors.surfaceLight}
            size={36}
            onPress={onDismiss}
          />
        ) : null}
      </View>
      <View style={{ height: 1, backgroundColor: colors.border }} />
      {isFullscreen ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {entry.builder(onDismiss)}
        </ScrollView>
      ) : (
        <View style={{ padding: 20 }}>{entry.builder(onDismiss)}</View>
      )}
    </View>
  );
}
