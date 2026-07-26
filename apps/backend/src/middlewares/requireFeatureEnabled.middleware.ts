import type { Request, Response, NextFunction, RequestHandler } from 'express';

import { platformConfig, type EnablementConfig } from '@lib/config/platform-config.service.js';
import { FeatureDisabledError } from '@lib/errors.js';

/** Capabilities an operator can switch off. Excludes `message`, which is copy, not a switch. */
export type Capability = Exclude<keyof EnablementConfig, 'message'>;

/**
 * Blocks a route while its capability is switched off platform-wide.
 *
 * One middleware rather than a check inside each service: a capability that is
 * off should be off everywhere it is reachable, and scattering the condition
 * across services is how one path ends up still open during maintenance.
 *
 * Returns 503 with the operator's own message so the client can show something
 * truthful instead of a generic failure. The config snapshot is in-process and
 * synchronous, so this costs nothing per request.
 *
 * Never apply this to the public-config or app-version endpoints — those are
 * how a client discovers it needs upgrading, and gating them would strand
 * users on a broken release with no route out.
 */
export const requireFeatureEnabled = (capability: Capability): RequestHandler => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    const enablement = platformConfig.enablement();
    if (enablement[capability]) {
      next();
      return;
    }
    next(new FeatureDisabledError(enablement.message));
  };
};
