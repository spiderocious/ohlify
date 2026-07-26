import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys the query cache and first-run flag live under.
 *
 * Shared so the logout path can purge exactly what the providers wrote — a
 * persisted cache left behind would show one user's balances and chats to
 * whoever signs in next on the same phone.
 */
export const PERSISTED_CACHE_KEY = 'ohlify-query-cache';
const FIRST_RUN_KEY = 'ohlify.first-run.completed';

export const isFirstRunComplete = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(FIRST_RUN_KEY)) === 'true';

export const markFirstRunComplete = async (): Promise<void> => {
  await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
};

export const clearFirstRun = async (): Promise<void> => {
  await AsyncStorage.removeItem(FIRST_RUN_KEY);
};
