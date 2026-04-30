/** Mirror of mobile/lib/shared/helpers/mask_account_number.dart. */
export function maskAccountNumber(account: string): string {
  if (account.length < 4) return '****';
  const last = account.slice(account.length - 4);
  return `${'*'.repeat(account.length - 4)}${last}`;
}
