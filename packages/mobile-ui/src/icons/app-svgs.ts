/**
 * Centralised registry of custom SVG icon components.
 *
 * Source: mobile/lib/ui/icons/app_svgs.dart (AppSvgs) + the 13 files under
 * mobile/assets/svg/icons/ + mobile/assets/svg/flags/ng.svg. Each Flutter
 * asset path maps to a same-named `.svg` under ./assets, imported here as a
 * React component via react-native-svg-transformer (see metro.config.js in
 * apps/mobile).
 */
import FlagNg from './assets/flags/ng.svg';
import Calendar from './assets/calendar.svg';
import Clock from './assets/clock.svg';
import IcCopy from './assets/ic_copy.svg';
import IcRatingBadge from './assets/ic_rating_badge.svg';
import Logo from './assets/logo.svg';
import MonthIcon from './assets/month-icon.svg';
import NavCalls from './assets/nav_calls.svg';
import NavChats from './assets/nav_chats.svg';
import NavHome from './assets/nav_home.svg';
import NavProfile from './assets/nav_profile.svg';
import NavWallet from './assets/nav_wallet.svg';
import Stopwatch from './assets/stopwatch.svg';
import TotalCallsIcon from './assets/total-calls-icon.svg';
import WeekIcon from './assets/week-icon.svg';

export const AppSvgs = {
  flagNg: FlagNg,
  logo: Logo,
  navHome: NavHome,
  navCalls: NavCalls,
  navChats: NavChats,
  navWallet: NavWallet,
  navProfile: NavProfile,
  copy: IcCopy,
  ratingBadge: IcRatingBadge,
  totalCallsIcon: TotalCallsIcon,
  monthIcon: MonthIcon,
  weekIcon: WeekIcon,
  clock: Clock,
  calendar: Calendar,
  stopwatch: Stopwatch,
} as const;

export type AppSvgName = keyof typeof AppSvgs;
