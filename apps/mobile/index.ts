import { registerRootComponent } from 'expo';

import { App } from './src/app';
import { installBackgroundPushHandlers } from './src/shared/push/push-service';

// Background/killed-state push handlers must be registered before React
// mounts — on a headless FCM wake the root component never renders at all.
// No-op on web.
installBackgroundPushHandlers();

registerRootComponent(App);
