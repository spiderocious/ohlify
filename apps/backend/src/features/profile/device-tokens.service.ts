import { ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './device-tokens.repo.js';
import type { DeleteDeviceTokenDto, RegisterDeviceTokenDto } from './profile.schema.js';

export const register = async (dto: RegisterDeviceTokenDto, userId: string) => {
  await repo.upsert({
    token: dto.token,
    userId,
    platform: dto.platform,
    ...(dto.app_version !== undefined ? { appVersion: dto.app_version } : {}),
  });
  return new ServiceSuccess({ registered: true }, MESSAGE_KEYS.DEVICE_TOKEN_REGISTERED);
};

export const unregister = async (dto: DeleteDeviceTokenDto, userId: string) => {
  await repo.deleteForUser(userId, dto.token);
  return new ServiceSuccess({ deleted: true }, MESSAGE_KEYS.DEVICE_TOKEN_DELETED);
};
