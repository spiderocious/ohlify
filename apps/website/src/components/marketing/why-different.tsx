import { IconMic, IconPhoneOff, IconVideo } from '@icons';

import { PhoneFrame } from './phone-frame';
import { ProfessionalTile } from './professional-tile';

/**
 * Long-form "why Ohlify" section. Three editorial blocks paired with a
 * paired phone-screen mockup each — replaces the generic 6-tile
 * features grid that came out of the v1 vibe-code.
 *
 * Layout: the phone column alternates left/right between blocks so the
 * eye keeps moving down the page. On small screens everything stacks
 * vertically, phone first.
 */
export function WhyDifferent() {
  return (
    <section id="why" className="section-rule px-6 py-24 lg:py-32">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="reveal-on-scroll max-w-2xl">
          <p className="eyebrow">Why Ohlify</p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.5rem)] font-medium leading-[1.02] text-ink">
            Trust isn&apos;t a feature. It&apos;s
            <br />
            <span className="italic text-ink-soft">how the whole thing is built.</span>
          </h2>
        </div>

        <div className="mt-20 flex flex-col gap-28 lg:gap-40">
          {/* Block 1 — Verified professionals (phone on right) */}
          <Block
            position="right"
            eyebrow="Verified, every one"
            title="The KYC isn't a checkbox."
            body={
              <>
                <p>
                  Every professional clears a real-document identity check, a
                  selfie liveness pass, and a credential review by a human
                  admin before they can take a single naira.
                </p>
                <p>
                  We track no-shows, mid-call drops, and dispute
                  outcomes per professional. Strikes accumulate. Bad actors
                  fall off the platform — they don&apos;t get away with a quiet
                  re-listing.
                </p>
              </>
            }
            visual={<KycVisual />}
          />

          {/* Block 2 — Escrow + automatic refunds (phone on left) */}
          <Block
            position="left"
            eyebrow="Escrow, not promises"
            title="Your money doesn't leave the platform until the call does."
            body={
              <>
                <p>
                  When you book, we charge you and route the funds into a
                  double-entry escrow ledger. The professional sees the
                  booking confirmed — but doesn&apos;t see a single naira
                  until the call ends.
                </p>
                <p>
                  No-show? Full refund, automatic, within seconds.
                  Mid-call drop? We pro-rate it. You never have to email
                  support to chase your own money back.
                </p>
              </>
            }
            visual={<WalletVisual />}
          />

          {/* Block 3 — Built for the call itself (phone on right) */}
          <Block
            position="right"
            eyebrow="The call itself"
            title="Crystal audio, no app dance."
            body={
              <>
                <p>
                  Built on enterprise real-time infrastructure. Tokens
                  renew silently mid-call. Connection drops trigger
                  automatic reconnects. CallKit on iOS so an incoming
                  ring looks like a phone call, not a notification.
                </p>
                <p>
                  Works on a Surulere data plan. Works in Lagos traffic.
                  Works.
                </p>
              </>
            }
            visual={<CallVisual />}
          />
        </div>
      </div>
    </section>
  );
}

/* ─── Block layout ──────────────────────────────────────────────────── */

interface BlockProps {
  position: 'left' | 'right';
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  visual: React.ReactNode;
}

function Block({ position, eyebrow, title, body, visual }: BlockProps) {
  const textOrderClass = position === 'left' ? 'lg:order-2' : 'lg:order-1';
  const visualOrderClass = position === 'left' ? 'lg:order-1' : 'lg:order-2';
  return (
    <div className="reveal-on-scroll grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div className={`flex justify-center ${visualOrderClass}`}>{visual}</div>
      <div className={`flex flex-col gap-5 ${textOrderClass}`}>
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="font-display text-[clamp(1.6rem,3.2vw,2.6rem)] font-medium leading-[1.05] text-ink">
          {title}
        </h3>
        <div className="space-y-4 text-[15px] leading-relaxed text-ink-soft">
          {body}
        </div>
      </div>
    </div>
  );
}

/* ─── Phone-screen mockups for each block ───────────────────────────── */

function KycVisual() {
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col bg-paper-elev px-5 pb-5 pt-8">
        <p className="font-display text-[20px] font-semibold leading-none tracking-tight">
          Verification
        </p>
        <p className="mt-1 text-[11px] text-muted">3 of 4 complete</p>
        <div className="mt-6 space-y-2.5">
          <KycRow label="Identity document" status="done" />
          <KycRow label="Selfie liveness" status="done" />
          <KycRow label="Bank account" status="done" />
          <KycRow label="Credential review" status="active" />
        </div>
        <div className="mt-auto rounded-2xl bg-ink p-4 text-paper">
          <p className="text-[11px] uppercase tracking-[0.14em] text-paper/60">
            Average review time
          </p>
          <p className="mt-1 font-display text-[28px] font-medium leading-none">
            17 hours
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}

function KycRow({ label, status }: { label: string; status: 'done' | 'active' }) {
  const dot =
    status === 'done'
      ? 'bg-emerald-500'
      : 'bg-accent';
  return (
    <div className="flex items-center gap-3 rounded-xl bg-paper px-3.5 py-2.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="flex-1 text-[13px] font-medium text-ink">{label}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {status === 'done' ? 'Done' : 'In review'}
      </span>
    </div>
  );
}

function WalletVisual() {
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col bg-paper-elev px-5 pb-5 pt-8">
        <p className="font-display text-[20px] font-semibold leading-none tracking-tight">
          Wallet
        </p>
        <p className="mt-1 text-[11px] text-muted">All movements settle live</p>
        <div className="mt-6 rounded-2xl bg-ink p-5 text-paper">
          <p className="text-[11px] uppercase tracking-[0.14em] text-paper/60">
            Available balance
          </p>
          <p className="mt-2 font-display text-[36px] font-medium leading-none tracking-tight">
            ₦42,500
          </p>
        </div>
        <div className="mt-4 space-y-2">
          <LedgerRow label="Booking · Dr. Okonkwo" amount="−₦15,000" />
          <LedgerRow label="Refund · no-show" amount="+₦15,000" tone="credit" />
          <LedgerRow label="Booking · Funmi Bello" amount="−₦12,000" />
        </div>
      </div>
    </PhoneFrame>
  );
}

function LedgerRow({
  label,
  amount,
  tone = 'debit',
}: {
  label: string;
  amount: string;
  tone?: 'debit' | 'credit';
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-paper px-3.5 py-2.5">
      <span className="truncate text-[12px] text-ink">{label}</span>
      <span
        className={`text-[12px] font-semibold ${tone === 'credit' ? 'text-emerald-700' : 'text-ink'}`}
      >
        {amount}
      </span>
    </div>
  );
}

function CallVisual() {
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col bg-ink px-5 pb-5 pt-8 text-paper">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/60">
            In call
          </span>
          <span className="font-mono text-[12px] font-semibold text-paper/80">
            12:48
          </span>
        </div>
        <div className="mt-12 flex flex-col items-center gap-3">
          <ProfessionalTile
            name="Dr. Adedeji Okonkwo"
            role="Cardiologist"
            rating={4.9}
            reviewCount={312}
            avatarTone="ember"
            variant="minimal"
          />
        </div>
        <div className="mt-auto flex items-center justify-center gap-3">
          <CallButton icon={<IconMic size={18} />} label="Mute" />
          <CallButton
            icon={<IconPhoneOff size={20} />}
            label="End"
            tone="end"
          />
          <CallButton icon={<IconVideo size={18} />} label="Video" />
        </div>
      </div>
    </PhoneFrame>
  );
}

function CallButton({
  icon,
  label,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  tone?: 'neutral' | 'end';
}) {
  // The end-call button is the one place red is acceptable on this
  // page — universal call-ending convention overrides the violet
  // palette.
  const bg =
    tone === 'end'
      ? 'bg-[#dc2626] shadow-[0_10px_30px_-10px_rgba(220,38,38,0.55)]'
      : 'bg-white/10';
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`grid h-12 w-12 place-items-center rounded-full text-white ${bg}`}>
        {icon}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-paper/60">
        {label}
      </span>
    </div>
  );
}
