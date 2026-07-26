import AsyncStorage from '@react-native-async-storage/async-storage';
import { amountVisibility } from '@ohlify/mobile-ui';

const KEY = 'ohlify.amounts.hidden';

/**
 * Restores the hide-amounts preference and keeps it saved.
 *
 * The store itself lives in mobile-ui (where money is rendered) and knows
 * nothing about storage; this is the app side of that split. Someone who hid
 * their balance yesterday should not find it showing today.
 */
export async function initAmountVisibility(): Promise<void> {
  const stored = await AsyncStorage.getItem(KEY);
  amountVisibility.set(stored === 'true');

  amountVisibility.subscribe(() => {
    void AsyncStorage.setItem(KEY, amountVisibility.isHidden() ? 'true' : 'false');
  });
}
