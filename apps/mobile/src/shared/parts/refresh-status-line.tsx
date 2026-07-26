import { AppText, colors } from '@ohlify/mobile-ui';
import { View } from 'react-native';

import { useRefreshState } from '@shared/api/use-refresh-state';

/**
 * One quiet line under a screen title.
 *
 * Renders nothing when the data is current and online — the common case should
 * be silent. It speaks up only to say a refresh is running, or that what is on
 * screen is old because the network is gone.
 */
export function RefreshStatusLine({ queryKey }: { queryKey: readonly unknown[] }) {
  const { label, isOffline } = useRefreshState(queryKey);
  if (!label) return null;

  return (
    <View style={{ paddingTop: 2, paddingBottom: 6 }}>
      <AppText
        variant="bodySmall"
        color={isOffline ? colors.warning : colors.textMuted}
        align="left"
      >
        {label}
      </AppText>
    </View>
  );
}
