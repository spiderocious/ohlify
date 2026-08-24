import { useState } from 'react';

import {
  HawkAmountMaskingToggle,
  HawkAppBar,
  HawkBalanceCard,
  HawkBottomNav,
  HawkBreadcrumb,
  HawkButton,
  HawkCallControls,
  HawkCallInvite,
  HawkCallQuality,
  HawkCallSurface,
  HawkDataState,
  HawkKycProgress,
  HawkKycStep,
  HawkList,
  HawkMenu,
  HawkOutOfMinutes,
  HawkPagination,
  HawkPreConnect,
  HawkPurchaseIntent,
  HawkStrikeNotice,
  HawkTabs,
  HawkTrustBadge,
  HawkUpgradeGate,
  HawkWithdrawSummary,
  IconChat,
  IconEdit,
  IconEscrow,
  IconHome,
  IconMoreVertical,
  IconTrash,
  IconUser,
  IconWallet,
  lookupStatus,
} from '@ohlify/hawk-ui';

import {
  PreviewGrid,
  PreviewPage,
  PreviewSection,
  PreviewStage,
  PreviewState,
  PreviewStates,
} from './preview-shell.js';

const kyc = (key: string) => lookupStatus('kyc', key)!;

/**
 * @HawkPage slug=121-call-preconnect name=Call surfaces group=Calls & live
 * @HawkStates dialling active reconnecting out-of-minutes invite
 *
 * The dark surfaces, and the pre-connection bill.
 */
export function PageCalls() {
  return (
    <PreviewPage
      title="Call surfaces"
      kicker="Calls & live · 121–125, 153"
      intro="All of them sit on the near-black call ground rather than paper. The call is the one place the product goes dark: a full-attention surface, often held to the ear or watched in the dark."
    >
      <PreviewSection
        title="Pre-connection — the last screen before money moves"
        rule="Shows the rate, the balance and the minutes it buys, together, before the call starts. This is the evidence rule applied to the call: a per-second product must never begin billing from a screen that did not say what it costs."
      >
        <PreviewGrid columns={2}>
          <PreviewStage className="p-0" dark>
            <div className="h-[36rem] overflow-hidden">
              <HawkPreConnect
                name="Adaeze Okonkwo"
                ratePerMinuteKobo={250_000}
                balanceKobo={842_000}
                estimatedMinutes={33}
                onStart={() => {}}
                onCancel={() => {}}
              />
            </div>
          </PreviewStage>
          <PreviewStage className="p-0" dark>
            <div className="h-[36rem] overflow-hidden">
              <HawkPreConnect
                name="Adaeze Okonkwo"
                ratePerMinuteKobo={250_000}
                balanceKobo={120_000}
                estimatedMinutes={0}
                blockedReason="Your balance buys less than a minute. Top up to call."
                onCancel={() => {}}
              />
            </div>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="The live call"
        note="End-call is visually distinct and physically separated from the toggles — it is the one irreversible control here, and it must not sit in a row of identical circles where a mis-tap ends a paid call."
      >
        <PreviewStage className="p-0" dark>
          <div className="h-[38rem] overflow-hidden">
            <HawkCallSurface
              name="Adaeze Okonkwo"
              state="active"
              seconds={137}
              ratePerSecondKobo={4167}
              remainingSeconds={900}
            >
              <HawkCallControls videoAvailable onEnd={() => {}} />
            </HawkCallSurface>
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Connection quality & out of minutes">
        <PreviewGrid columns={2}>
          <PreviewStage dark>
            <div className="flex flex-col gap-hawk-4">
              {(['good', 'fair', 'poor', 'lost'] as const).map((quality) => (
                <HawkCallQuality key={quality} quality={quality} />
              ))}
            </div>
          </PreviewStage>
          <PreviewStage ground>
            <HawkOutOfMinutes remainingSeconds={90} onTopUp={() => {}} onEnd={() => {}} />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Invite"
        rule="Names the payer explicitly. In a multi-party call the inviter pays, and someone accepting an invite is entitled to know before they answer whether they are about to be billed."
      >
        <PreviewStage className="p-0" dark>
          <div className="h-[34rem] overflow-hidden">
            <HawkCallInvite
              name="Chidi Nwosu"
              payer="Chidi"
              onAccept={() => {}}
              onDecline={() => {}}
            />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={3}>
        {(['dialling', 'active', 'reconnecting'] as const).map((state) => (
          <PreviewState key={state} name={state} className="bg-hawk-call-ground">
            <div className="h-56 overflow-hidden">
              <HawkCallSurface name="Adaeze" state={state} seconds={137} />
            </div>
          </PreviewState>
        ))}
        <PreviewState name="out-of-minutes">
          <HawkOutOfMinutes remainingSeconds={45} />
        </PreviewState>
        <PreviewState name="invite" className="bg-hawk-call-ground">
          <div className="h-56 overflow-hidden">
            <HawkCallInvite name="Chidi" />
          </div>
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=126-app-bar name=Navigation group=Navigation
 * @HawkStates default active badge
 *
 * App bar, bottom nav, tabs, menu, pagination.
 */
export function PageNavigation() {
  const [tab, setTab] = useState('pending');
  const [nav, setNav] = useState('home');

  return (
    <PreviewPage
      title="Navigation"
      kicker="Navigation · 126–130"
      intro="Labels are always visible on the bottom bar, never icon-only. An icon-only bar saves twelve pixels and costs first-time users the ability to tell what anything does."
    >
      <PreviewSection title="App bar">
        <PreviewStage className="p-0">
          <HawkAppBar title="Withdrawals" subtitle="12 pending" onBack={() => {}} sticky={false} />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Bottom nav">
        <PreviewStage className="p-0">
          <HawkBottomNav
            items={[
              { value: 'home', label: 'Home', icon: IconHome },
              { value: 'chats', label: 'Chats', icon: IconChat, badge: 3 },
              { value: 'wallet', label: 'Wallet', icon: IconWallet },
              { value: 'profile', label: 'Profile', icon: IconUser },
            ]}
            value={nav}
            onChange={setNav}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Tabs"
        note="Scrolls horizontally rather than wrapping. A tab row that wraps to two lines changes the page's height as the user switches, which pushes the content they are reading."
      >
        <PreviewStage className="p-0">
          <HawkTabs
            tabs={[
              { value: 'pending', label: 'Pending', count: 12 },
              { value: 'approved', label: 'Approved', count: 248 },
              { value: 'rejected', label: 'Rejected', count: 3 },
              { value: 'failed', label: 'Failed', count: 0 },
            ]}
            value={tab}
            onChange={setTab}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Menu, breadcrumb & pagination"
        rule="Pagination is previous/next rather than numbered pages: this backend is cursor-only, and rendering page numbers over a cursor API would mean either lying about how many pages exist or fetching everything to count."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="menu">
            <HawkMenu
              trigger={<HawkButton label="Actions" variant="outline" size="sm" endIcon={IconMoreVertical} />}
              items={[
                { label: 'Edit', icon: IconEdit, onClick: () => {} },
                { label: 'Duplicate', onClick: () => {} },
                { label: 'Delete', icon: IconTrash, destructive: true, separated: true, onClick: () => {} },
              ]}
            />
          </PreviewStage>
          <PreviewStage label="breadcrumb & pagination">
            <div className="flex flex-col gap-hawk-5">
              <HawkBreadcrumb
                items={[
                  { label: 'Wallets', onClick: () => {} },
                  { label: 'Journals', onClick: () => {} },
                  { label: 'JNL-4821' },
                ]}
              />
              <HawkPagination
                hasPrevious
                hasNext
                onPrevious={() => {}}
                onNext={() => {}}
                summary="Showing 25"
              />
            </div>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="default">
          <HawkTabs tabs={[{ value: 'a', label: 'All' }]} value="a" onChange={() => {}} />
        </PreviewState>
        <PreviewState name="active">
          <HawkTabs
            tabs={[{ value: 'a', label: 'All' }, { value: 'b', label: 'Pending' }]}
            value="b"
            onChange={() => {}}
          />
        </PreviewState>
        <PreviewState name="badge">
          <HawkBottomNav
            items={[{ value: 'chats', label: 'Chats', icon: IconChat, badge: 3 }]}
            value="chats"
            onChange={() => {}}
          />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=131-purchase-intent name=Money surfaces group=Money
 * @HawkStates fresh stale masked loading
 *
 * Balances, bills and the masking preference.
 */
export function PageMoney() {
  const [masked, setMasked] = useState(false);

  return (
    <PreviewPage
      title="Money surfaces"
      kicker="Money · 131–135, 158, 87"
      intro="Held funds are shown separately and never added in. Escrowed money is not spendable, and a single total that includes it promises a balance the user cannot use."
    >
      <PreviewSection
        title="Balance card"
        rule="Stale balances say so. You may browse a balance offline; you may not act on one — the card surfaces the age rather than quietly showing a number that may have moved."
      >
        <PreviewGrid columns={2}>
          <PreviewStage ground>
            <HawkBalanceCard
              balanceKobo={842_000}
              heldKobo={301_000}
              onToggleMask={() => setMasked((m) => !m)}
              actions={
                <>
                  <HawkButton label="Top up" size="sm" onDark variant="solid" onClick={() => {}} />
                  <HawkButton label="Withdraw" size="sm" onDark variant="outline" onClick={() => {}} />
                </>
              }
            />
          </PreviewStage>
          <PreviewStage ground>
            <HawkBalanceCard
              balanceKobo={842_000}
              dataState={HawkDataState.STALE}
              ageMs={4 * 60_000}
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Purchase intent — the itemised bill"
        rule="Every line is shown, including fees. A total with no breakdown is what makes users distrust a wallet, and in a product that debits a real ledger the breakdown is not a courtesy — it is the record the user is agreeing to."
      >
        <PreviewGrid columns={2}>
          <PreviewStage>
            <HawkPurchaseIntent
              description="30 minutes with Adaeze Okonkwo"
              lines={[
                { label: 'Call time · 30 min', amountKobo: 7_500_000 },
                { label: 'Platform fee', amountKobo: 375_000 },
              ]}
              totalKobo={7_875_000}
              balanceKobo={8_420_000}
              onConfirm={() => {}}
              onCancel={() => {}}
            />
          </PreviewStage>
          <PreviewStage>
            <HawkWithdrawSummary
              amountKobo={8_420_000}
              feeKobo={5_000}
              destination="GTBank ••••4821"
              eta="within 24 hours"
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="The masking preference"
        rule="One switch, app-wide. The copy says 'every amount' on purpose: a user who thinks this hides only their wallet balance will be surprised when the in-call earnings counter is masked too, and surprise about what is hidden is the one thing a privacy control cannot afford."
      >
        <PreviewStage>
          <div className="max-w-md">
            <HawkAmountMaskingToggle masked={masked} onChange={setMasked} />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="fresh">
          <HawkBalanceCard balanceKobo={842_000} />
        </PreviewState>
        <PreviewState name="stale">
          <HawkBalanceCard balanceKobo={842_000} dataState={HawkDataState.STALE} ageMs={240_000} />
        </PreviewState>
        <PreviewState name="masked" note="Use the header toggle.">
          <HawkBalanceCard balanceKobo={842_000} />
        </PreviewState>
        <PreviewState name="loading">
          <HawkBalanceCard balanceKobo={0} dataState={HawkDataState.LOADING} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=141-kyc-flow name=Trust group=Trust
 * @HawkStates not-started under-review verified action-needed
 *
 * KYC, strikes and upgrade gates.
 */
export function PageTrust() {
  return (
    <PreviewPage
      title="Trust"
      kicker="Trust · 141–143"
      intro="A strike is something the system has done to the user and reports — hazard, not critical. It is not a button they can press, and it is not an irreversible operator action."
    >
      <PreviewSection title="KYC flow">
        <PreviewStage>
          <div className="flex max-w-lg flex-col gap-hawk-6">
            <HawkKycProgress
              completed={2}
              total={4}
              description="Verified professionals get 3× more calls."
            />
            <HawkList>
              <HawkKycStep label="Email address" status={kyc('verified')} />
              <HawkKycStep label="Identity document" status={kyc('verified')} />
              <HawkKycStep
                label="Bank account"
                description="Submitted 2 days ago"
                status={kyc('under_review')}
                onAction={() => {}}
                actionLabel="View"
              />
              <HawkKycStep
                label="Proof of address"
                description="The document was unreadable"
                status={kyc('action_needed')}
                onAction={() => {}}
                actionLabel="Re-upload"
              />
            </HawkList>
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Strike notice"
        rule="The dispute route is always offered. A penalty with no appeal is a support ticket the product could have handled itself."
      >
        <PreviewGrid columns={2}>
          <HawkStrikeNotice
            reason="Left mid-call"
            issuedAt="18 Aug 2026"
            count={2}
            limit={3}
            consequence="One more strike will suspend your ability to take calls for 7 days."
            onDispute={() => {}}
          />
          <HawkStrikeNotice
            reason="Late cancellation"
            issuedAt="4 Aug 2026"
            status={lookupStatus('strike', 'voided')!}
          />
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Upgrade gate"
        rule="Leads with what unlocking gives them, not with what is blocked. 'Verify to start earning' is a reason; 'You are not verified' is a wall."
      >
        <PreviewGrid columns={2}>
          <HawkUpgradeGate
            title="Verify to start earning"
            description="We need to confirm who you are before money can move."
            benefits={[
              'Set your own rates',
              'Withdraw to your bank account',
              'Appear in search results',
            ]}
            actionLabel="Verify your identity"
            onAction={() => {}}
          />
          <PreviewStage>
            <div className="flex flex-wrap gap-hawk-3">
              <HawkTrustBadge label="Identity verified" />
              <HawkTrustBadge label="Escrow protected" icon={IconEscrow} semantic="info" />
            </div>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={4}>
        {(['not_started', 'under_review', 'verified', 'action_needed'] as const).map((key) => (
          <PreviewState key={key} name={key.replace(/_/g, '-')}>
            <HawkKycStep label="Identity" status={kyc(key)} />
          </PreviewState>
        ))}
      </PreviewStates>
    </PreviewPage>
  );
}
