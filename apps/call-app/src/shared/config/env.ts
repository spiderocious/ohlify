interface CallAppEnv {
  VITE_BACKEND_URL: string;
  VITE_AGORA_APP_ID: string;
  VITE_AGORA_LOG_LEVEL: '0' | '1' | '2' | '3' | '4';
  VITE_ENABLE_TEST_HARNESS: 'true' | 'false';
}

const raw = import.meta.env as Record<string, string>;

export const env: CallAppEnv = {
  VITE_BACKEND_URL: raw['VITE_BACKEND_URL'] ?? '',
  VITE_AGORA_APP_ID: raw['VITE_AGORA_APP_ID'] ?? '',
  VITE_AGORA_LOG_LEVEL: (raw['VITE_AGORA_LOG_LEVEL'] as CallAppEnv['VITE_AGORA_LOG_LEVEL']) ?? '1',
  VITE_ENABLE_TEST_HARNESS: (raw['VITE_ENABLE_TEST_HARNESS'] as 'true' | 'false') ?? 'false',
};

export const isTestHarnessEnabled = env.VITE_ENABLE_TEST_HARNESS === 'true';
