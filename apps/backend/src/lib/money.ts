declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };
export type Money = bigint & Brand<'Money'>;

export const toMoney = (kobo: bigint | number): Money => BigInt(kobo) as Money;

export const addMoney = (a: Money, b: Money): Money => (a + b) as Money;

export const subMoney = (a: Money, b: Money): Money => {
  if (b > a) throw new RangeError('Money subtraction would go negative');
  return (a - b) as Money;
};

export const moneyToKobo = (m: Money): bigint => m;

export const moneyToNaira = (m: Money): string =>
  (Number(m) / 100).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  });
