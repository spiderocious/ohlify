import { Router, type IRouter } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { ipRateLimit } from '@lib/redis/rateLimit.js';

import * as controller from './call-sessions.controller.js';
import { CreateCallSessionSchema } from './call-sessions.schema.js';

const router: IRouter = Router();

router.post('/', ipRateLimit(10, 60), validate(CreateCallSessionSchema), controller.create);

router.get('/:session_id/:party', controller.getParty);

export default router;
