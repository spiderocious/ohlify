import { IconStar } from '@icons';

/**
 * Marketing-only professional card. The card itself carries a 1px
 * border + slight elevation so it has visible separation from the
 * cream phone-screen background — earlier versions sat invisibly on
 * white-on-white.
 *
 * Hierarchy (top → bottom):
 *   1. Identity row: avatar + name (display serif) + role (sans muted)
 *   2. Tagline: credentials / experience line, sans muted
 *   3. Footer row: rating · review count   →   price or CTA
 *
 * Long names are allowed to wrap to a second line — display-serif at
 * 15px on a 240px-ish card has the space, and forced single-line
 * truncation ("Dr. Adedeji Okonk…") wrecks the whole point of showing
 * a real human. The footer row is `flex items-center justify-between`
 * with `min-w-0` on the rating block so the button never pushes the
 * name out.
 *
 * `variant`:
 *   - `'cta'`     : action pill (used in the live demo).
 *   - `'price'`   : "from ₦X" label (used in the hero — no real tap).
 *   - `'minimal'` : identity row only.
 */

const AVATAR_TONES: Record<string, { bg: string; fg: string }> = {
  ember: { bg: 'bg-[#E7DEFF]', fg: 'text-[#3a32a8]' },
  violet: { bg: 'bg-[#DDE3FF]', fg: 'text-[#2a249d]' },
  emerald: { bg: 'bg-[#D9F1E1]', fg: 'text-[#1F6F49]' },
  amber: { bg: 'bg-[#FFEBC5]', fg: 'text-[#8A5A12]' },
  default: { bg: 'bg-paper-line', fg: 'text-ink' },
};

interface ProfessionalTileProps {
  name: string;
  role: string;
  tagline?: string;
  rating: number;
  reviewCount: number;
  avatarTone?: string;
  priceFromNaira?: number;
  variant?: 'cta' | 'price' | 'minimal';
  onTap?: () => void;
}

export function ProfessionalTile({
  name,
  role,
  tagline,
  rating,
  reviewCount,
  avatarTone = 'default',
  priceFromNaira,
  variant = 'cta',
  onTap,
}: ProfessionalTileProps) {
  const tone = AVATAR_TONES[avatarTone] ?? AVATAR_TONES.default!;
  const initials = name
    .split(' ')
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  const Wrapper: React.ElementType = onTap ? 'button' : 'div';
  const wrapperProps = onTap
    ? { type: 'button' as const, onClick: onTap }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="block w-full rounded-2xl border border-paper-line bg-white p-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[13px] font-bold ${tone.bg} ${tone.fg}`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] font-semibold leading-[1.2] text-ink">
            {name}
          </p>
          <p className="mt-1 truncate text-[12px] font-medium text-muted">
            {role}
          </p>
        </div>
      </div>

      {tagline && variant !== 'minimal' && (
        <p className="mt-3 truncate text-[11px] text-muted">{tagline}</p>
      )}

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px]">
          <IconStar size={11} className="shrink-0 text-highlight" fill="currentColor" />
          <span className="font-semibold text-ink">{rating.toFixed(1)}</span>
          <span className="truncate text-muted">· {reviewCount} reviews</span>
        </span>
        {variant === 'cta' && (
          <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-accent px-3 text-[10px] font-semibold tracking-tight text-white">
            Schedule call →
          </span>
        )}
        {variant === 'price' && priceFromNaira !== undefined && (
          <span className="shrink-0 text-[11px] text-muted">
            from{' '}
            <span className="font-semibold text-ink">
              ₦{priceFromNaira.toLocaleString('en-NG')}
            </span>
          </span>
        )}
      </div>
    </Wrapper>
  );
}
