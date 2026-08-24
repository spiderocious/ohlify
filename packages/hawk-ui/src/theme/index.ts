export {
  HawkSemantic,
  HAWK_SEMANTICS,
  HAWK_QUARTET,
  HAWK_HAZARD,
  HAWK_DANGER,
  HAWK_MONEY_INK,
  HawkMoneyDirection,
  quartet,
} from './semantic.js';
export type { HawkQuartet } from './semantic.js';

export {
  HawkDuration,
  HawkEasing,
  HawkOverlayTiming,
  HawkSpace,
  HawkRadius,
  HawkZ,
  HawkPalette,
  HawkVar,
  HAWK_STAGGER_STEP_MS,
  HAWK_STAGGER_CAP,
} from './tokens.js';

export {
  HawkRegister,
  HawkRegisterScope,
  HawkProvider,
  useHawkRegister,
  useHawkAmbient,
  useHawkMasked,
  useHawkReducedMotion,
} from './register.js';
export type { HawkAmbient, HawkProviderProps, HawkRegisterScopeProps } from './register.js';
