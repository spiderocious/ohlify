import { useNavigation } from '@react-navigation/native';
import { useIsProfessional } from '@ohlify/mobile-ui';
import { useEffect, type ReactNode } from 'react';

/**
 * Router-level guard for professional-only screens (Rates, Bank account,
 * Booking blocks). ProfileMenu already hides the rows that lead here for
 * clients, but a deep link or stale nav state could still land a client on
 * the screen directly — this pops back immediately if that happens, mirroring
 * what a route-level redirect guard would do in a router with that concept.
 */
export function RequireProfessional({ children }: { children: ReactNode }) {
  const isProfessional = useIsProfessional();
  const navigation = useNavigation();

  useEffect(() => {
    if (!isProfessional && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [isProfessional, navigation]);

  if (!isProfessional) return null;
  return <>{children}</>;
}
