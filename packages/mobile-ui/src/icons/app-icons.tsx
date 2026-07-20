import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

/**
 * Material glyph icons — React Native port.
 *
 * Source: mobile/lib/ui/icons/app_icons.dart (AppIcons). Flutter renders
 * these from the bundled Material Icons font; `@expo/vector-icons`'s
 * MaterialIcons set is the same glyph family, so this reproduces the exact
 * shapes rather than hand-drawing approximations. Each export is the
 * `MaterialIcons` glyph name — pass to <MaterialIconGlyph name={...} />.
 *
 * All icons used in the app must go through this file. Never import
 * MaterialIcons directly in a screen/component.
 */
export const AppIconNames = {
  // Navigation
  chevronRight: 'chevron-right',
  chevronLeft: 'chevron-left',
  chevronDown: 'keyboard-arrow-down',
  arrowUpward: 'arrow-upward',
  arrowDownward: 'arrow-downward',
  back: 'arrow-back',

  // Bottom nav
  navHome: 'home',
  navCalls: 'calendar-today',
  navWallet: 'account-balance-wallet',
  navProfile: 'account-circle',

  // Header actions
  copyLink: 'content-copy',
  notification: 'notifications',
  notificationActive: 'notifications-active',
  mailOutline: 'mail-outline',

  // Actions
  close: 'close',
  add: 'add',
  edit: 'edit',
  delete: 'delete-outline',
  search: 'search',
  logout: 'logout',
  refresh: 'refresh',

  // Status / feedback
  check: 'check',
  checkCircle: 'check-circle',
  info: 'info-outline',
  warning: 'warning-amber',
  error: 'error-outline',
  wifiOff: 'wifi-off',

  // Visibility
  eye: 'visibility',
  eyeOff: 'visibility-off',

  // Communication
  phone: 'phone',
  video: 'videocam',
  chat: 'chat-bubble-outline',

  // Social / ratings
  star: 'star',
  medal: 'military-tech',
  // role_selection_screen.dart uses Icons.workspace_premium_rounded directly
  // for the professional-role card icon, bypassing the app's own AppIcons.medal
  // (which maps to military_tech) — kept as a distinct entry to match exactly.
  workspacePremium: 'workspace-premium',

  // Profile / settings
  person: 'person-outline',
  settings: 'settings',
  clock: 'schedule',
  atSign: 'alternate-email',
  work: 'work-outline',
  article: 'article',
  interests: 'interests',
  badge: 'badge',
  cameraAlt: 'camera-alt',
  payments: 'payments',
  hourglassTop: 'hourglass-top',
  insertDriveFile: 'insert-drive-file',
  uploadFile: 'upload-file',
  calendarToday: 'calendar-today',
  accessTime: 'access-time',
  timer: 'timer',
  receiptLong: 'receipt-long',
  event: 'event',
  send: 'send',
  headsetMic: 'headset-mic',

  // Finance
  building: 'account-balance',

  // Wallet transaction vocabulary — keys shipped by GET /wallet/transactions
  // (see backend `wallet.vocabulary.ts`). Mirror the Flutter registry in
  // mobile/lib/ui/icons/app_icons.dart. Both registries MUST know every
  // key the server can send, or icons render blank.
  wallet_plus: 'account-balance-wallet',
  wallet_minus: 'money-off',
  phone_outgoing: 'call-made',
  phone_incoming: 'call-received',
  phone_refund: 'phone-callback',
  bank_arrow_up: 'north',
  bank_arrow_down: 'south',
  admin_shield: 'admin-panel-settings',
  gift: 'card-giftcard',

  // Dev tools
  components: 'widgets',
} as const satisfies Record<string, ComponentProps<typeof MaterialIcons>['name']>;

export type AppIconName = keyof typeof AppIconNames;

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
}

export function AppIcon({ name, size = 24, color = '#111827' }: AppIconProps) {
  return <MaterialIcons name={AppIconNames[name]} size={size} color={color} />;
}
