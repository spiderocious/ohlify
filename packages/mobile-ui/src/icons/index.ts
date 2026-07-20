/**
 * Icon proxy. Every consumer — primitives, domain widgets, modals, shell,
 * feature code in apps/mobile — imports icons from here, never from
 * `@expo/vector-icons` or a raw `.svg` import directly. Swapping icon
 * sources later is a one-file change (mirrors packages/ui/src/icons).
 */
export { AppIcon, AppIconNames } from './app-icons';
export type { AppIconName } from './app-icons';
export { AppSvg } from './app-svg';
export { AppSvgs } from './app-svgs';
export type { AppSvgName } from './app-svgs';
