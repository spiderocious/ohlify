export {
  HawkText,
  HawkHeading,
  HawkCaption,
  HawkOverline,
  HawkInk,
  HawkTextVariant,
  HAWK_INK_CLASS,
} from './text.js';
export type { HawkTextProps, HawkHeadingProps, HawkCaptionProps } from './text.js';

export { HawkFigure, HawkDurationFigure } from './figure.js';
export type { HawkFigureProps, HawkDurationFigureProps } from './figure.js';

export {
  NAIRA,
  HAWK_MASK,
  toKobo,
  formatKobo,
  formatKoboCompact,
  formatDuration,
  costOfSeconds,
} from './money.js';
export type { HawkKobo, HawkMoneyOptions } from './money.js';

export {
  HawkSkeleton,
  HawkSkeletonLine,
  HawkSkeletonParagraph,
  HawkSkeletonRegion,
} from './skeleton.js';
export type { HawkSkeletonProps, HawkSkeletonLineProps } from './skeleton.js';

export { HawkIcon, HawkPerforation } from './icon.js';
export type { HawkIconProps } from './icon.js';
