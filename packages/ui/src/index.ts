// Theme
export * from './theme/index.js';

// Utils
export { cn } from './utils/cn.js';

// Primitives
export { AppText } from './primitives/app-text/index.js';
export type { AppTextVariant } from './primitives/app-text/index.js';

export { AppButton } from './primitives/app-button/index.js';
export type { AppButtonVariant } from './primitives/app-button/index.js';

export { AppIconButton } from './primitives/app-icon-button/index.js';
export type {
  AppIconButtonVariant,
  AppIconButtonShape,
} from './primitives/app-icon-button/index.js';

export { AppTextInput } from './primitives/app-text-input/index.js';
export type { CharSupported } from './primitives/app-text-input/index.js';

export { AppTextAreaInput } from './primitives/app-text-area-input/index.js';
export { AppPhoneInput } from './primitives/app-phone-input/index.js';
export { AppOtpInput } from './primitives/app-otp-input/index.js';
export { AppSearchBar } from './primitives/app-search-bar/index.js';

export { AppTag } from './primitives/app-tag/index.js';
export type { AppTagVariant, AppTagRadius, AppTagSize } from './primitives/app-tag/index.js';

export { AppLoader } from './primitives/app-loader/index.js';
export { AppErrorState, AppEmptyState } from './primitives/app-error-state/index.js';
export { FeatureErrorBoundary } from './primitives/feature-error-boundary/index.js';
export { ScreenContinueBar } from './primitives/screen-continue-bar/index.js';
export { AppSvg } from './primitives/app-svg/index.js';

export { AppToast } from './primitives/app-toast/index.js';
export type { ToastType } from './primitives/app-toast/index.js';

export { AppDropdownInput } from './primitives/app-dropdown-input/index.js';
export type { DropdownOption } from './primitives/app-dropdown-input/index.js';
export { AppMultiSelectDropdown } from './primitives/app-multi-select-dropdown/index.js';
export { AppDateInput } from './primitives/app-date-input/index.js';

// Shell
export {
  AppBottomNavBar,
  appMainNavItems,
  AppHeader,
  AppBanner,
  AppTabView,
  AppSidebar,
  AppShell,
} from './shell/index.js';
export type {
  AppBottomNavBarItem,
  AppBannerVariant,
  AppTabItem,
  AppSidebarItem,
} from './shell/index.js';

// Domain widgets
export {
  SectionHeader,
  ProfessionalRating,
  ProfessionalListTile,
  UpcomingCallCard,
  CategoryFilterBar,
  ProfessionalHeader,
  KycProgressHeader,
  KycItemTile,
  InterestsForm,
  OccupationForm,
  BankAccountForm,
  AddRateForm,
  RatesGroup,
  ProfessionalRatesList,
  RatesListScreen,
} from './domain/index.js';
export type { RatesController } from './domain/index.js';

// Modals + DrawerService
export { DrawerService, ModalHost, ToastHost } from './modals/index.js';
export type {
  ConfirmationModalOptions,
  CustomModalOptions,
  DrawerHandle,
  FeedbackModalOptions,
  InputModalOptions,
  InputModalInputType,
  ModalConfirmationKind,
  ModalFeedbackKind,
  ModalPosition,
  ToastOptions,
  ToastPosition,
} from './modals/index.js';

// Icons are NOT re-exported here. Import them via the dedicated proxy:
//   import { IconBack, IconPhone } from '@icons';
// This keeps the icon source swappable in one file (packages/ui/src/icons/index.ts).
