import { ServiceSuccess } from '@lib/service-result.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import * as repo from './device-tokens.repo.js';
import type { DeleteDeviceTokenDto, RegisterDeviceTokenDto } from './profile.schema.js';

/**
 * `null` and `undefined` mean the same thing here: the client had nothing to
 * report. The schema accepts both because `deviceInfo()` on mobile nulls any
 * field `expo-device` cannot supply, so the key is present-but-null rather than
 * absent. Collapsing them keeps the stored columns clean without the caller
 * having to care which form arrived.
 */
const present = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null;

export const register = async (dto: RegisterDeviceTokenDto, userId: string) => {
  await repo.upsert({
    token: dto.token,
    userId,
    platform: dto.platform,
    ...(present(dto.app_version) ? { appVersion: dto.app_version } : {}),
    ...(present(dto.device_name) ? { deviceName: dto.device_name } : {}),
    ...(present(dto.device_model) ? { deviceModel: dto.device_model } : {}),
    ...(present(dto.os_version) ? { osVersion: dto.os_version } : {}),
  });
  return new ServiceSuccess({ registered: true }, MESSAGE_KEYS.DEVICE_TOKEN_REGISTERED);
};

export const unregister = async (dto: DeleteDeviceTokenDto, userId: string) => {
  await repo.deleteForUser(userId, dto.token);
  return new ServiceSuccess({ deleted: true }, MESSAGE_KEYS.DEVICE_TOKEN_DELETED);
};
