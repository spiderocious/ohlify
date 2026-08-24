import {
  HawkCallRow,
  HawkChatRow,
  HawkKycItemRow,
  HawkList,
  HawkMinutesHeldRow,
  HawkNotificationRow,
  HawkProfessionalRow,
  HawkProfessionalRowSkeleton,
  HawkRateRow,
  HawkReviewRow,
  HawkRowSkeleton,
  HawkScheduleRow,
  HawkTransactionRow,
  HawkTransactionRowSkeleton,
  IconBell,
  IconPhone,
  IconReceipt,
  IconWallet,
  lookupStatus,
} from '@ohlify/hawk-ui';

import {
  PreviewPage,
  PreviewSection,
  PreviewState,
  PreviewStates,
} from './preview-shell.js';

const call = (key: string) => lookupStatus('call', key)!;
const withdrawal = (key: string) => lookupStatus('withdrawal', key)!;
const kyc = (key: string) => lookupStatus('kyc', key)!;
const booking = (key: string) => lookupStatus('booking', key)!;

/**
 * @HawkPage slug=96-row-professional name=Rows group=Rows
 * @HawkStates default skeleton unread
 *
 * The ten row shapes.
 */
export function PageRows() {
  return (
    <PreviewPage
      title="Rows"
      kicker="Rows · 96–105"
      intro="Ten distinct components rather than one configurable Row, because the information hierarchy genuinely differs — a transaction leads with an amount, a chat leads with a name and an unread count, a call leads with a direction glyph."
    >
      <PreviewSection
        title="Professional"
        note="A public rate is not the viewer's money, so it opts out of masking."
      >
        <HawkList>
          <HawkProfessionalRow
            name="Adaeze Okonkwo"
            headline="Tax & corporate law · 8 years"
            ratePerMinuteKobo={250_000}
            rating={4.8}
            reviewCount={128}
            presence="online"
            verified
            onClick={() => {}}
          />
          <HawkProfessionalRow
            name="Chidi Nwosu"
            headline="Property disputes"
            ratePerMinuteKobo={180_000}
            rating={4.5}
            reviewCount={42}
            presence="busy"
            onClick={() => {}}
          />
        </HawkList>
      </PreviewSection>

      <PreviewSection
        title="Transaction"
        rule="Direction drives the ink strictly by sign, and debits render as ink rather than red — red means failed, and a successful debit is not a failure. The status badge carries whether it worked; the colour carries which way the money moved."
      >
        <HawkList>
          <HawkTransactionRow
            title="Call with Chidi Nwosu"
            subtitle="12 min 04 s"
            amountKobo={301_000}
            direction="debit"
            timestamp="14:22"
            icon={IconPhone}
            status={call('completed')}
          />
          <HawkTransactionRow
            title="Wallet top-up"
            subtitle="Paystack"
            amountKobo={5_000_000}
            direction="credit"
            timestamp="09:15"
            icon={IconWallet}
          />
          <HawkTransactionRow
            title="Withdrawal to GTBank"
            subtitle="0123456789"
            amountKobo={8_420_000}
            direction="debit"
            timestamp="Yesterday"
            icon={IconReceipt}
            status={withdrawal('pending')}
          />
          <HawkTransactionRow
            title="Refund — call did not connect"
            amountKobo={301_000}
            direction="reversal"
            timestamp="18 Aug"
            icon={IconReceipt}
          />
        </HawkList>
      </PreviewSection>

      <PreviewSection title="Call history & chat threads">
        <HawkList>
          <HawkCallRow
            name="Adaeze Okonkwo"
            duration="12:04"
            costKobo={301_000}
            timestamp="14:22"
            status={call('completed')}
            onClick={() => {}}
          />
          <HawkCallRow
            name="Fatima Bello"
            video
            timestamp="Yesterday"
            status={call('missed')}
            onClick={() => {}}
          />
          <HawkChatRow
            name="Chidi Nwosu"
            preview="Are you free at 15:00?"
            timestamp="14:04"
            unread={3}
            presence="online"
            onClick={() => {}}
          />
          <HawkChatRow
            name="Ngozi Eze"
            preview="Thanks, that was really helpful."
            timestamp="Mon"
            ownLast
            onClick={() => {}}
          />
        </HawkList>
      </PreviewSection>

      <PreviewSection title="Notifications">
        <HawkList>
          <HawkNotificationRow
            title="Payment received"
            body="₦8,420 from your call with Chidi Nwosu."
            timestamp="14:25"
            icon={IconWallet}
            semantic="success"
            unread
            onClick={() => {}}
          />
          <HawkNotificationRow
            title="Missed call"
            body="Fatima Bello tried to reach you."
            timestamp="Yesterday"
            icon={IconPhone}
            semantic="caution"
            onClick={() => {}}
          />
          <HawkNotificationRow
            title="Scheduled maintenance"
            body="Withdrawals will pause between 02:00 and 04:00."
            timestamp="18 Aug"
            icon={IconBell}
            onClick={() => {}}
          />
        </HawkList>
      </PreviewSection>

      <PreviewSection title="Rates, reviews & KYC">
        <HawkList>
          <HawkRateRow label="Standard consultation" amountKobo={250_000} minimumMinutes={15} onEdit={() => {}} />
          <HawkRateRow label="Extended review" amountKobo={400_000} minimumMinutes={30} active={false} onEdit={() => {}} />
          <HawkReviewRow
            author="Chidi Nwosu"
            rating={5}
            comment="Clear, direct and did not waste my time. Exactly what I needed."
            timestamp="2 days ago"
          />
          <HawkReviewRow author="Anonymous" anonymous rating={3} comment="Helpful, but the call dropped twice." timestamp="1 week ago" />
          <HawkKycItemRow label="Identity document" status={kyc('verified')} />
          <HawkKycItemRow label="Bank account" status={kyc('under_review')} description="Submitted 2 days ago" />
          <HawkKycItemRow label="Proof of address" status={kyc('action_needed')} description="The document was unreadable" onClick={() => {}} />
        </HawkList>
      </PreviewSection>

      <PreviewSection
        title="Held funds & schedule proposals"
        rule="The held amount renders in the muted ink rather than the credit green: it is not yet the professional's money, and colouring it as a credit would promise a balance they cannot withdraw."
      >
        <HawkList>
          <HawkMinutesHeldRow
            title="Call with Chidi Nwosu"
            amountKobo={301_000}
            releasesAt="in 22 hours"
            subtitle="Held until the dispute window closes"
          />
          <HawkScheduleRow
            date="Tue 3 Sep"
            time="14:00 – 14:30"
            proposedBy="Chidi Nwosu"
            status={booking('pending')}
            onAccept={() => {}}
            onDecline={() => {}}
          />
        </HawkList>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="default">
          <HawkProfessionalRow name="Adaeze Okonkwo" headline="Tax law" ratePerMinuteKobo={250_000} />
        </PreviewState>
        <PreviewState name="skeleton" note="Mirrors the row's own layout.">
          <div className="flex flex-col">
            <HawkProfessionalRowSkeleton />
            <HawkTransactionRowSkeleton />
            <HawkRowSkeleton />
          </div>
        </PreviewState>
        <PreviewState name="unread" note="Full ink on the preview, accent on the timestamp.">
          <HawkChatRow name="Chidi Nwosu" preview="Are you free at 15:00?" timestamp="14:04" unread={3} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}
