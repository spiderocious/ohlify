import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 2^16 KiB = 64 MB
  timeCost: 3,
  parallelism: 1,
};

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, ARGON2_OPTIONS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  argon2.verify(hash, plain, ARGON2_OPTIONS);
