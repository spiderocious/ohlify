import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '../../app.navigation';

/**
 * Module-level navigation ref so non-component code (push handlers, deep
 * links) can navigate. Lives in its own file — app.navigation.tsx attaches
 * it to the NavigationContainer; push modules import it without creating a
 * runtime cycle (the RootStackParamList import above is type-only).
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
