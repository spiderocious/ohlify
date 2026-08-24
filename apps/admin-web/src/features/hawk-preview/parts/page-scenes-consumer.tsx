import { useState } from 'react';

import {
  HawkAppBar,
  HawkAvatar,
  HawkBadge,
  HawkBalanceCard,
  HawkBottomNav,
  HawkButton,
  HawkCallout,
  HawkCallSurface,
  HawkCallControls,
  HawkCaption,
  HawkCard,
  HawkChatBubble,
  HawkChatBubbleSkeleton,
  HawkChatComposer,
  HawkChatRow,
  HawkCallRow,
  HawkCodeInput,
  HawkContinueBar,
  HawkDataState,
  HawkEmptyState,
  HawkErrorState,
  HawkFeedbackMessage,
  HawkFigure,
  HawkFreshnessBanner,
  HawkIcon,
  HawkHeading,
  HawkIdentity,
  HawkKeypad,
  HawkKycItemRow,
  HawkKycProgress,
  HawkKycStep,
  HawkList,
  HawkMenuLink,
  HawkNotificationRow,
  HawkPass,
  HawkPrice,
  HawkProfessionalRow,
  HawkProfessionalRowSkeleton,
  HawkQuickReplies,
  HawkRowSkeleton,
  HawkProgressBar,
  HawkRadioGroup,
  HawkRateRow,
  HawkRating,
  HawkReviewRow,
  HawkSearchInput,
  HawkSectionHeader,
  HawkSegmentedControl,
  HawkSlotPicker,
  HawkStatCompact,
  HawkStepperProgress,
  HawkSuccessMoment,
  HawkTabs,
  HawkTag,
  HawkTalkToCta,
  HawkText,
  HawkTextInput,
  HawkTile,
  HawkTransactionRow,
  HawkTrustBadge,
  HawkUpgradeGate,
  IconChat,
  IconHome,
  IconLogOut,
  IconPhone,
  IconReceipt,
  IconSettings,
  IconUser,
  IconWallet,
  lookupStatus,
} from '@ohlify/hawk-ui';

import {
  PreviewGrid,
  PreviewPage,
  PreviewSection,
  PreviewStage,
} from './preview-shell.js';

const call = (k: string) => lookupStatus('call', k)!;
const kyc = (k: string) => lookupStatus('kyc', k)!;
const booking = (k: string) => lookupStatus('booking', k)!;

/** A phone-sized frame, so scenes read at the size they ship at. */
function Phone({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className={`mx-auto flex h-[40rem] w-full max-w-[24rem] flex-col overflow-hidden rounded-hawk-fixed-xl border border-hawk-line ${
        dark ? 'bg-hawk-call-ground' : 'bg-hawk-canvas'
      }`}
    >
      {children}
    </div>
  );
}

function Scroll({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col gap-hawk-6 overflow-y-auto p-hawk-5">{children}</div>;
}

/**
 * @HawkPage slug=210-scene-splash-onboarding name=Splash, onboarding & role group=Scenes — consumer
 * @HawkStates splash role onboarding
 */
export function SceneOnboarding() {
  const [role, setRole] = useState('professional');

  return (
    <PreviewPage
      title="Splash · onboarding · role"
      kicker="Scene · 210"
      intro="First run. The cache warms inside the lock — warming data for someone who has not proved the device is theirs would leak it onto a locked screen."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="warming the cache" ground className="p-hawk-4">
          <Phone>
            <Scroll>
              <HawkHeading level={3}>Setting things up</HawkHeading>
              <HawkCaption>This only happens once.</HawkCaption>
              <HawkProgressBar value={0.6} />
              <HawkList carded={false}>
                <HawkKycItemRow label="Your profile" status={kyc('verified')} />
                <HawkKycItemRow label="Recent calls" status={kyc('verified')} />
                <HawkKycItemRow label="Wallet" status={kyc('under_review')} description="Loading…" />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="choose a role" ground className="p-hawk-4">
          <Phone>
            <Scroll>
              <HawkHeading level={3}>How will you use Ohlify?</HawkHeading>
              <HawkRadioGroup
                options={[
                  { value: 'client', label: 'I want advice', description: 'Talk to a professional by the minute' },
                  { value: 'professional', label: 'I give advice', description: 'Get paid for your time' },
                ]}
                value={role}
                onChange={setRole}
              />
            </Scroll>
            <HawkContinueBar onContinue={() => {}} />
          </Phone>
        </PreviewStage>

        <PreviewStage label="onboarding" ground className="p-hawk-4">
          <Phone>
            <Scroll>
              <HawkStepperProgress steps={['Profile', 'Rates', 'Bank', 'Review']} current={1} />
              <HawkHeading level={3}>Set your rates</HawkHeading>
              <HawkCaption>You can change these any time.</HawkCaption>
              <HawkList>
                <HawkRateRow label="Standard consultation" amountKobo={250_000} minimumMinutes={15} onEdit={() => {}} />
              </HawkList>
              <HawkButton label="Add another rate" variant="outline" block onClick={() => {}} />
            </Scroll>
            <HawkContinueBar onContinue={() => {}} secondaryLabel="Skip" onSecondary={() => {}} />
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=211-scene-auth name=Login, register & verify group=Scenes — consumer
 * @HawkStates login verify error
 */
export function SceneAuth() {
  return (
    <PreviewPage
      title="Login · register · verify"
      kicker="Scene · 211"
      intro="For security, the recovery flow never says whether an account exists for an address."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="login" ground className="p-hawk-4">
          <Phone>
            <Scroll>
              <HawkHeading level={2}>Welcome back</HawkHeading>
              <HawkTextInput label="Email" placeholder="you@example.com" />
              <HawkTextInput label="Password" />
              <HawkButton label="Sign in" size="lg" block onClick={() => {}} />
              <HawkCaption>Forgot your password?</HawkCaption>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="verify" ground className="p-hawk-4">
          <Phone>
            <Scroll>
              <HawkHeading level={3}>Check your email</HawkHeading>
              <HawkCaption>We sent a six-digit code to adaeze@example.com.</HawkCaption>
              <HawkCodeInput length={6} value="4821" onChange={() => {}} />
              <HawkCaption>Resend in 00:42</HawkCaption>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="locked out" ground className="p-hawk-4">
          <Phone>
            <Scroll>
              <HawkFeedbackMessage title="Too many attempts" message="Try again in 5 minutes." />
              <HawkCodeInput
                length={6}
                masked
                state={{ disabled: true, error: true, errorText: 'Locked until 14:38' }}
              />
              <HawkCallout
                semantic="info"
                message="For your security, we do not say whether an account exists for this address."
              />
            </Scroll>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=220-scene-recovery-lock name=Recovery & app lock group=Scenes — consumer
 * @HawkStates lock recovery
 */
export function SceneLock() {
  return (
    <PreviewPage
      title="Recovery · first-run · lock"
      kicker="Scene · 220"
      intro="The keypad rather than the platform keyboard: it is faster, and a full keyboard on a passcode screen is a shoulder-surfing risk."
    >
      <PreviewGrid columns={2}>
        <PreviewStage label="app lock" ground className="p-hawk-4">
          <Phone>
            <div className="flex flex-1 flex-col items-center justify-center gap-hawk-6 p-hawk-6">
              <HawkAvatar name="Adaeze Okonkwo" size="lg" />
              <HawkHeading level={4}>Enter your passcode</HawkHeading>
              <HawkCodeInput length={4} masked onChange={() => {}} />
              <HawkKeypad onDigit={() => {}} onBackspace={() => {}} />
            </div>
          </Phone>
        </PreviewStage>

        <PreviewStage label="password recovery" ground className="p-hawk-4">
          <Phone>
            <Scroll>
              <HawkHeading level={3}>Reset your password</HawkHeading>
              <HawkCaption>We will email you a code.</HawkCaption>
              <HawkTextInput label="Email" placeholder="you@example.com" />
              <HawkButton label="Send code" size="lg" block onClick={() => {}} />
              <HawkCallout
                semantic="info"
                message="For your security, we do not say whether an account exists for this address."
              />
            </Scroll>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=204-scene-client-home name=Client & professional home group=Scenes — consumer
 * @HawkStates client professional stale
 */
export function SceneHome() {
  return (
    <PreviewPage
      title="Client home · professional home"
      kicker="Scene · 203–204"
      intro="Two roles, two hierarchies. The client leads with who to call; the professional leads with what they have earned."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="client" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Ohlify" sticky={false} />
            <Scroll>
              <HawkSearchInput placeholder="What do you need help with?" />
              <HawkSectionHeader title="Available now" />
              <HawkList>
                <HawkProfessionalRow
                  name="Adaeze Okonkwo"
                  headline="Tax & corporate law"
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
                  presence="online"
                  onClick={() => {}}
                />
              </HawkList>
            </Scroll>
            <HawkBottomNav
              items={[
                { value: 'home', label: 'Home', icon: IconHome },
                { value: 'chats', label: 'Chats', icon: IconChat, badge: 3 },
                { value: 'wallet', label: 'Wallet', icon: IconWallet },
                { value: 'profile', label: 'Profile', icon: IconUser },
              ]}
              value="home"
              onChange={() => {}}
            />
          </Phone>
        </PreviewStage>

        <PreviewStage label="professional" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Today" sticky={false} />
            <Scroll>
              <HawkBalanceCard
                balanceKobo={842_000}
                heldKobo={301_000}
                label="Available to withdraw"
                actions={<HawkButton label="Withdraw" size="sm" onDark onClick={() => {}} />}
              />
              <div className="flex gap-hawk-7">
                <HawkStatCompact label="Calls today" value="4" />
                <HawkStatCompact label="Minutes" value="63" />
                <HawkStatCompact label="Earned" valueKobo={1_575_000} />
              </div>
              <HawkSectionHeader title="Recent calls" />
              <HawkList>
                <HawkCallRow name="Chidi Nwosu" duration="12:04" costKobo={301_000} timestamp="14:22" status={call('completed')} />
                <HawkCallRow name="Fatima Bello" timestamp="Yesterday" status={call('missed')} />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="offline / stale" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Today" sticky={false} />
            <HawkFreshnessBanner offline ageLabel="14:22" onRefresh={() => {}} />
            <Scroll>
              <HawkBalanceCard
                balanceKobo={842_000}
                dataState={HawkDataState.STALE}
                ageMs={4 * 60_000}
              />
              <HawkCallout
                semantic="caution"
                message="You can browse offline, but you cannot start a call on a saved balance."
              />
            </Scroll>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=215-scene-search name=Search & professional detail group=Scenes — consumer
 * @HawkStates results empty detail
 */
export function SceneSearch() {
  return (
    <PreviewPage
      title="Search · professional detail"
      kicker="Scene · 215, 221"
      intro="The detail screen is where the evidence rule shows: the rate and what it buys sit beside the action, not behind it."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="results" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Search" onBack={() => {}} sticky={false} />
            <Scroll>
              <HawkSearchInput value="tax" onChange={() => {}} />
              <HawkSegmentedControl
                segments={[
                  { value: 'all', label: 'All', count: 24 },
                  { value: 'online', label: 'Online', count: 6 },
                ]}
                value="all"
                onChange={() => {}}
                block
              />
              <HawkList>
                <HawkProfessionalRow name="Adaeze Okonkwo" headline="Tax & corporate law" ratePerMinuteKobo={250_000} rating={4.8} presence="online" verified onClick={() => {}} />
                <HawkProfessionalRow name="Segun Adeyemi" headline="Tax advisory" ratePerMinuteKobo={200_000} rating={4.2} presence="offline" onClick={() => {}} />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="no results" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Search" onBack={() => {}} sticky={false} />
            <Scroll>
              <HawkSearchInput value="astrophysics" onChange={() => {}} />
              <HawkEmptyState
                title="No one matches that yet"
                description="Try a broader term, or browse by category."
                action={<HawkButton label="Browse categories" size="sm" onClick={() => {}} />}
              />
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="detail" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar onBack={() => {}} sticky={false} />
            <Scroll>
              <div className="flex flex-col items-center gap-hawk-4">
                <HawkAvatar name="Adaeze Okonkwo" size="xl" verified />
                <HawkHeading level={3}>Adaeze Okonkwo</HawkHeading>
                <HawkCaption>Tax &amp; corporate law · 8 years</HawkCaption>
                <HawkRating value={4.8} readOnly showValue count={128} />
                <div className="flex gap-hawk-3">
                  <HawkTrustBadge label="Identity verified" />
                  <HawkTag label="Tax law" />
                </div>
              </div>
              <HawkCard variant="sunken">
                <HawkText variant="caption" ink="muted">
                  Straightforward advice on company tax, filings and disputes. I will tell you
                  quickly if you do not need a lawyer.
                </HawkText>
              </HawkCard>
              <HawkSectionHeader title="Reviews" />
              <HawkList>
                <HawkReviewRow author="Chidi Nwosu" rating={5} comment="Clear and did not waste my time." timestamp="2 days ago" />
              </HawkList>
            </Scroll>
            <div className="border-t border-hawk-line bg-hawk-paper p-hawk-5">
              <HawkTalkToCta name="Adaeze" ratePerMinuteKobo={250_000} videoAvailable onAudio={() => {}} onVideo={() => {}} />
            </div>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=218-scene-schedule name=Schedule a call group=Scenes — consumer
 * @HawkStates picking confirming booked
 */
export function SceneSchedule() {
  const [slot, setSlot] = useState<string | undefined>('14:30');

  return (
    <PreviewPage
      title="Schedule a call"
      kicker="Scene · 218"
      intro="Unavailable slots stay visible — seeing that 14:00 is taken tells the user something real about demand."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="pick a time" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Schedule" onBack={() => {}} sticky={false} />
            <Scroll>
              <HawkIdentity name="Adaeze Okonkwo" subtitle="Tax & corporate law" />
              <HawkTabs
                tabs={[
                  { value: 'tue', label: 'Tue 3' },
                  { value: 'wed', label: 'Wed 4' },
                  { value: 'thu', label: 'Thu 5' },
                ]}
                value="tue"
                onChange={() => {}}
              />
              <HawkSlotPicker
                value={slot}
                onChange={setSlot}
                slots={[
                  { time: '09:00', available: true },
                  { time: '09:30', available: false, reason: 'Booked' },
                  { time: '10:00', available: true },
                  { time: '14:00', available: false, reason: 'Booked' },
                  { time: '14:30', available: true },
                  { time: '15:00', available: true },
                ]}
              />
            </Scroll>
            <HawkContinueBar onContinue={() => {}} />
          </Phone>
        </PreviewStage>

        <PreviewStage label="confirm" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Confirm" onBack={() => {}} sticky={false} />
            <Scroll>
              <HawkCard>
                <div className="flex flex-col gap-hawk-4">
                  <HawkIdentity name="Adaeze Okonkwo" subtitle="Tue 3 Sep · 14:30 – 15:00" />
                  <HawkPrice amountKobo={250_000} />
                  <HawkCaption>
                    You are not charged now. Billing starts when the call connects, per second.
                  </HawkCaption>
                </div>
              </HawkCard>
              <HawkCallout
                semantic="info"
                message="Cancelling less than an hour before may result in a strike."
              />
            </Scroll>
            <HawkContinueBar label="Book this time" onContinue={() => {}} />
          </Phone>
        </PreviewStage>

        <PreviewStage label="booked" ground className="p-hawk-4">
          <Phone>
            <div className="flex flex-1 items-center">
              <HawkSuccessMoment
                title="You are booked"
                description="Tue 3 Sep at 14:30. We will remind you 15 minutes before."
                action={<HawkButton label="Add to calendar" block onClick={() => {}} />}
                secondaryAction={<HawkButton label="Done" variant="ghost" block onClick={() => {}} />}
              />
            </div>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=201-scene-call name=The live call group=Scenes — consumer
 * @HawkStates preconnect active ending
 */
export function SceneCall() {
  return (
    <PreviewPage
      title="The live call"
      kicker="Scene · 201"
      intro="The full arc: what it will cost, what it is costing, and what it cost."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="connecting" ground className="p-hawk-4">
          <Phone dark>
            <HawkCallSurface name="Adaeze Okonkwo" state="ringing">
              <HawkCallControls onEnd={() => {}} />
            </HawkCallSurface>
          </Phone>
        </PreviewStage>

        <PreviewStage label="connected" ground className="p-hawk-4">
          <Phone dark>
            <HawkCallSurface
              name="Adaeze Okonkwo"
              state="active"
              seconds={137}
              ratePerSecondKobo={4167}
              remainingSeconds={900}
            >
              <HawkCallControls videoAvailable onEnd={() => {}} />
            </HawkCallSurface>
          </Phone>
        </PreviewStage>

        <PreviewStage label="ended" ground className="p-hawk-4">
          <Phone>
            <div className="flex flex-1 items-center">
              <HawkSuccessMoment
                title="Call ended"
                highlight={<HawkFigure value={301_000} size="lg" />}
                description="12 minutes 4 seconds with Adaeze Okonkwo."
                action={<HawkButton label="Leave a review" block onClick={() => {}} />}
                secondaryAction={<HawkButton label="Done" variant="ghost" block onClick={() => {}} />}
              />
            </div>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=212-scene-calls name=Calls list group=Scenes — consumer
 * @HawkStates default loading empty
 */
export function SceneCalls() {
  return (
    <PreviewPage
      title="Calls list"
      kicker="Scene · 212"
      intro="History, filtered by outcome. A missed call is the row worth finding, so it gets its own tab rather than a colour."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="default" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Calls" sticky={false} />
            <Scroll>
              <HawkTabs
                tabs={[
                  { value: 'all', label: 'All', count: 63 },
                  { value: 'missed', label: 'Missed', count: 4 },
                ]}
                value="all"
                onChange={() => {}}
              />
              <HawkList>
                <HawkCallRow name="Adaeze Okonkwo" duration="12:04" costKobo={301_000} timestamp="14:22" status={call('completed')} onClick={() => {}} />
                <HawkCallRow name="Fatima Bello" video timestamp="Yesterday" status={call('missed')} onClick={() => {}} />
                <HawkCallRow name="Segun Adeyemi" duration="04:11" costKobo={82_000} timestamp="18 Aug" status={call('completed')} onClick={() => {}} />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="loading" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Calls" sticky={false} />
            <Scroll>
              <HawkList>
                <HawkRowSkeleton />
                <HawkRowSkeleton />
                <HawkRowSkeleton />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="empty" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Calls" sticky={false} />
            <Scroll>
              <HawkEmptyState
                icon={IconPhone}
                title="No calls yet"
                description="Your call history appears here once you have spoken to someone."
              />
            </Scroll>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/** The chats bottom nav, so the list reads as a tab rather than a page. */
const CHAT_NAV = [
  { value: 'home', label: 'Home', icon: IconHome },
  { value: 'calls', label: 'Calls', icon: IconPhone },
  { value: 'chats', label: 'Chats', icon: IconChat },
  { value: 'wallet', label: 'Wallet', icon: IconWallet },
  { value: 'profile', label: 'Profile', icon: IconUser },
] as const;

/**
 * @HawkPage slug=213-scene-chats name=Chats list & thread group=Scenes — consumer
 * @HawkStates default loading skeleton error empty stale
 *
 * Optimistic send, inline call events, quick replies, and a composer that
 * keeps working offline.
 *
 * The motion contract this scene stands for (spec 213):
 *
 *   sent      → appears instantly, dimmed, with a clock   (0ms)
 *   confirmed → opacity to 1, the tick swaps in           (--d-fast)
 *   failed    → bubble turns critical, retry appears      (--d-fast)
 *   received  → slides up and fades from the bottom       (--d-base)
 *   typing    → quick replies vanish                      (--d-fast)
 *   re-entry  → from cache, never a spinner               (0ms)
 *
 * `HawkChatBubble` owns the first three: `status` drives the dim-and-clock,
 * the tick, and the critical treatment, so a screen never re-implements them.
 */
export function SceneChats() {
  return (
    <PreviewPage
      title="Chats list & thread"
      kicker="Scene · 213"
      intro="Delivery status appears on the viewer's own messages only — a read receipt on a received message leaks the other party's state."
    >
      <PreviewSection
        title="Thread list and thread"
        rule="The thread opens from cache and never shows a spinner on re-entry. A conversation you have already read should not make you wait to read it again."
      >
        <PreviewGrid columns={3}>
          <PreviewStage label="default — list" ground className="p-hawk-4">
            <Phone>
              <HawkAppBar title="Chats" sticky={false} />
              <Scroll>
                <HawkList>
                  <HawkChatRow name="Dr. Adaeze Okonkwo" preview="See you at 4pm then" timestamp="12m" unread={2} presence="online" onClick={() => {}} />
                  <HawkChatRow name="Tunde Bello" preview="Thanks for your time" timestamp="2h" ownLast onClick={() => {}} />
                  <HawkChatRow name="Chidi Eze" preview="Let me check my calendar" timestamp="1d" onClick={() => {}} />
                </HawkList>
              </Scroll>
              <HawkBottomNav items={CHAT_NAV} value="chats" onChange={() => {}} />
            </Phone>
          </PreviewStage>

          <PreviewStage label="default — thread" ground className="p-hawk-4">
            <Phone>
              <HawkAppBar
                title="Dr. Adaeze Okonkwo"
                subtitle="Available"
                onBack={() => {}}
                sticky={false}
              />
              <div className="flex min-h-0 flex-1 flex-col gap-hawk-4 overflow-y-auto p-hawk-5">
                {/*
                  Minutes held leads the thread. It is the fact that decides
                  whether a call can even start, and burying it under the
                  scrollback means the user finds out at the worst moment.
                */}
                <HawkCard variant="sunken" className="text-center">
                  <HawkCaption ink="muted">
                    You hold <span className="hawk-record font-semibold">14:32</span> with Adaeze
                  </HawkCaption>
                </HawkCard>

                <HawkChatBubble
                  own
                  message="Hi Adaeze, I would like to talk about my father's BP readings."
                  timestamp="14:01"
                  status="read"
                />
                <HawkChatBubble
                  message="Good afternoon. Yes, I have about 15 minutes now."
                  timestamp="14:02"
                />

                {/* A call inside the thread is an event, not a message. */}
                <HawkCard variant="sunken">
                  <div className="flex items-center gap-hawk-4">
                    <HawkIcon icon={IconPhone} size={14} className="text-hawk-ink-muted" />
                    <HawkText variant="caption" ink="muted" className="flex-1">
                      Audio call · 14:32
                    </HawkText>
                    <HawkCaption ink="disabled" className="hawk-record">
                      14:02
                    </HawkCaption>
                  </div>
                </HawkCard>

                {/* Optimistic: dimmed with a clock until the server confirms. */}
                <HawkChatBubble
                  own
                  message="Thank you, that was very helpful."
                  status="sending"
                />
              </div>
              <HawkQuickReplies replies={['Thanks!', 'Can we schedule?']} onSelect={() => {}} />
              <HawkChatComposer onSend={() => {}} onAttach={() => {}} />
            </Phone>
          </PreviewStage>

          <PreviewStage label="skeleton" ground className="p-hawk-4">
            <Phone>
              <HawkAppBar title="Chats" sticky={false} />
              <Scroll>
                <HawkList>
                  <HawkRowSkeleton />
                  <HawkRowSkeleton />
                  <HawkRowSkeleton />
                </HawkList>
              </Scroll>
              <HawkBottomNav items={CHAT_NAV} value="chats" onChange={() => {}} />
            </Phone>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="States"
        rule="Every state is built with this component rather than assembled afterwards — a skeleton designed later will not match the shape it stands in for."
      >
        <PreviewGrid columns={3}>
          <PreviewStage label="loading — thread" ground className="p-hawk-4">
            <Phone>
              <HawkAppBar title="Dr. Adaeze Okonkwo" onBack={() => {}} sticky={false} />
              <div className="flex min-h-0 flex-1 flex-col gap-hawk-4 overflow-y-auto p-hawk-5">
                {/*
                  Alternating sides, because a column of identical blocks
                  reads as a broken layout rather than as a conversation.
                */}
                <HawkChatBubbleSkeleton />
                <HawkChatBubbleSkeleton own />
                <HawkChatBubbleSkeleton />
                <HawkChatBubbleSkeleton own />
              </div>
              <HawkChatComposer disabled onSend={() => {}} />
            </Phone>
          </PreviewStage>

          <PreviewStage label="empty" ground className="p-hawk-4">
            <Phone>
              <HawkAppBar title="Chats" sticky={false} />
              <Scroll>
                <HawkEmptyState
                  icon={IconChat}
                  title="No conversations yet"
                  description="When you message a professional, your threads appear here."
                  action={<HawkButton label="Browse professionals" pill onClick={() => {}} />}
                />
              </Scroll>
              <HawkBottomNav items={CHAT_NAV} value="chats" onChange={() => {}} />
            </Phone>
          </PreviewStage>

          <PreviewStage label="error" ground className="p-hawk-4">
            <Phone>
              <HawkAppBar title="Chats" sticky={false} />
              <Scroll>
                {/* Failed with no usable cache. Always carries a retry. */}
                <HawkErrorState
                  title="Could not load"
                  description="Your conversations could not be fetched."
                  onRetry={() => {}}
                />
              </Scroll>
              <HawkBottomNav items={CHAT_NAV} value="chats" onChange={() => {}} />
            </Phone>
          </PreviewStage>

          <PreviewStage label="stale — offline" ground className="p-hawk-4">
            <Phone>
              <HawkAppBar title="Dr. Adaeze" onBack={() => {}} sticky={false} />
              {/* Cached and real, rendered with its age. Never silently current. */}
              <HawkFreshnessBanner offline ageLabel="saved data" />
              <div className="flex min-h-0 flex-1 flex-col gap-hawk-4 overflow-y-auto p-hawk-5">
                <HawkChatBubble
                  own
                  message="Are you free tomorrow?"
                  status="failed"
                  onRetry={() => {}}
                />
              </div>
              {/*
                The composer stays live offline. A queued message is a promise
                the app can keep; a disabled input is one it refuses to make.
              */}
              <HawkChatComposer onSend={() => {}} />
              <div className="border-t border-hawk-line bg-hawk-paper px-hawk-5 py-hawk-3 text-center">
                <HawkCaption ink="muted">Queued — sends when you are back online</HawkCaption>
              </div>
            </Phone>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=202-scene-wallet name=Wallet group=Scenes — consumer
 * @HawkStates default fund withdraw
 */
export function SceneWallet() {
  return (
    <PreviewPage
      title="Wallet"
      kicker="Scene · 202, 132–133"
      intro="Held funds are shown but never added into the spendable total."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="wallet" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Wallet" sticky={false} />
            <Scroll>
              <HawkBalanceCard
                balanceKobo={842_000}
                heldKobo={301_000}
                actions={
                  <>
                    <HawkButton label="Top up" size="sm" onDark onClick={() => {}} />
                    <HawkButton label="Withdraw" size="sm" variant="outline" onDark onClick={() => {}} />
                  </>
                }
              />
              <HawkSectionHeader title="Recent" />
              <HawkList>
                <HawkTransactionRow title="Call with Chidi" amountKobo={301_000} direction="debit" timestamp="14:22" icon={IconPhone} status={call('completed')} />
                <HawkTransactionRow title="Wallet top-up" amountKobo={5_000_000} direction="credit" timestamp="09:15" icon={IconWallet} />
                <HawkTransactionRow title="Refund" amountKobo={82_000} direction="reversal" timestamp="18 Aug" icon={IconReceipt} />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="fund" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Top up" onBack={() => {}} sticky={false} />
            <Scroll>
              <HawkText variant="caption" ink="muted">
                How much would you like to add?
              </HawkText>
              <HawkFigure value={5_000_000} size="display" />
              <HawkCallout semantic="info" message="Card payments are processed by Paystack." />
            </Scroll>
            <HawkContinueBar label="Pay ₦50,000" onContinue={() => {}} />
          </Phone>
        </PreviewStage>

        <PreviewStage label="withdraw" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Withdraw" onBack={() => {}} sticky={false} />
            <Scroll>
              <HawkFigure value={8_420_000} size="display" />
              <HawkCard variant="sunken">
                <div className="flex flex-col gap-hawk-2">
                  <HawkCaption>To</HawkCaption>
                  <HawkText variant="body" ink="strong" record>
                    GTBank ••••4821
                  </HawkText>
                  <HawkCaption>Arrives within 24 hours</HawkCaption>
                </div>
              </HawkCard>
            </Scroll>
            <HawkContinueBar label="Withdraw" onContinue={() => {}} />
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=216-scene-notifications name=Notifications & profile group=Scenes — consumer
 * @HawkStates notifications profile empty
 */
export function SceneProfile() {
  return (
    <PreviewPage
      title="Notifications · profile hub"
      kicker="Scene · 214, 216"
      intro="The profile hub is where the masking preference lives, and where locked features explain themselves."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="notifications" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Notifications" sticky={false} />
            <Scroll>
              <HawkList>
                <HawkNotificationRow title="Payment received" body="₦8,420 from your call with Chidi." timestamp="14:25" icon={IconWallet} semantic="success" unread onClick={() => {}} />
                <HawkNotificationRow title="Missed call" body="Fatima Bello tried to reach you." timestamp="Yesterday" icon={IconPhone} semantic="caution" onClick={() => {}} />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="profile" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Profile" sticky={false} />
            <Scroll>
              <div className="flex flex-col items-center gap-hawk-3">
                <HawkAvatar name="Adaeze Okonkwo" size="xl" verified />
                <HawkHeading level={4}>Adaeze Okonkwo</HawkHeading>
                <HawkBadge label="Verified professional" semantic="success" dot />
              </div>
              <HawkList>
                <HawkMenuLink label="Personal details" icon={IconUser} onClick={() => {}} />
                <HawkMenuLink label="Your rates" icon={IconReceipt} onClick={() => {}} />
                <HawkMenuLink label="Bank account" description="GTBank ••••4821" icon={IconWallet} onClick={() => {}} />
                <HawkMenuLink label="Settings" icon={IconSettings} onClick={() => {}} />
                <HawkMenuLink label="Sign out" icon={IconLogOut} destructive noChevron onClick={() => {}} />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="empty & error" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Notifications" sticky={false} />
            <div className="flex flex-1 flex-col justify-center">
              <HawkEmptyState title="Nothing new" description="We will let you know when something happens." />
              <HawkErrorState compact onRetry={() => {}} />
            </div>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=217-scene-kyc name=KYC group=Scenes — consumer
 * @HawkStates progress gated review
 */
export function SceneKyc() {
  return (
    <PreviewPage
      title="KYC — the flow"
      kicker="Scene · 217, 141"
      intro="The gate leads with what verifying gives you, not with what is blocked."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="the gate" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Rates" sticky={false} />
            <Scroll>
              <HawkUpgradeGate
                title="Verify to start earning"
                description="We need to confirm who you are before money can move."
                benefits={['Set your own rates', 'Withdraw to your bank', 'Appear in search']}
                actionLabel="Verify your identity"
                onAction={() => {}}
              />
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="progress" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Verification" onBack={() => {}} sticky={false} />
            <Scroll>
              <HawkKycProgress completed={2} total={4} description="Verified professionals get 3× more calls." />
              <HawkList>
                <HawkKycStep label="Email address" status={kyc('verified')} />
                <HawkKycStep label="Identity document" status={kyc('verified')} />
                <HawkKycStep label="Bank account" description="Submitted 2 days ago" status={kyc('under_review')} onAction={() => {}} actionLabel="View" />
                <HawkKycStep label="Proof of address" description="The document was unreadable" status={kyc('action_needed')} onAction={() => {}} actionLabel="Re-upload" />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="under review" ground className="p-hawk-4">
          <Phone>
            <HawkAppBar title="Bank account" onBack={() => {}} sticky={false} />
            <Scroll>
              <HawkCallout
                semantic="caution"
                title="Under review"
                message="We are checking your details. This usually takes a day."
              />
              <HawkTextInput label="Account name" value="Adaeze Okonkwo" state={{ readOnly: true }} />
              <HawkTextInput label="Account number" value="0123456789" state={{ readOnly: true }} />
              <HawkTextInput
                label="Bank"
                value="GTBank"
                state={{ readOnly: true, error: true, errorText: 'Does not match your verified identity' }}
              />
            </Scroll>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=219-state-matrix name=State matrix group=Scenes — consumer
 * @HawkStates loading fresh stale empty error
 *
 * The same list in all five states.
 */
export function SceneStateMatrix() {
  const rows = (
    <HawkList>
      <HawkProfessionalRow name="Adaeze Okonkwo" headline="Tax law" ratePerMinuteKobo={250_000} rating={4.8} presence="online" />
      <HawkProfessionalRow name="Chidi Nwosu" headline="Property" ratePerMinuteKobo={180_000} rating={4.5} />
    </HawkList>
  );

  return (
    <PreviewPage
      title="State matrix"
      kicker="Scene · 219"
      intro="One list, every state it can be in. Errors are non-blocking when cached data exists — a thin banner over data the user keeps, never a full-screen error that discards it."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="loading" ground className="p-hawk-4">
          <Phone>
            <Scroll>
              <HawkList>
                <HawkProfessionalRowSkeleton />
                <HawkProfessionalRowSkeleton />
                <HawkProfessionalRowSkeleton />
              </HawkList>
            </Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="fresh" ground className="p-hawk-4">
          <Phone>
            <Scroll>{rows}</Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="stale — data kept" ground className="p-hawk-4">
          <Phone>
            <HawkFreshnessBanner ageLabel="4 min ago" onRefresh={() => {}} />
            <Scroll>{rows}</Scroll>
          </Phone>
        </PreviewStage>

        <PreviewStage label="empty" ground className="p-hawk-4">
          <Phone>
            <div className="flex flex-1 items-center">
              <HawkEmptyState
                title="No one available"
                description="Try again in a few minutes."
                action={<HawkButton label="Refresh" size="sm" onClick={() => {}} />}
              />
            </div>
          </Phone>
        </PreviewStage>

        <PreviewStage label="error — cold cache" ground className="p-hawk-4">
          <Phone>
            <div className="flex flex-1 items-center">
              <HawkErrorState onRetry={() => {}} />
            </div>
          </Phone>
        </PreviewStage>

        <PreviewStage label="offline" ground className="p-hawk-4">
          <Phone>
            <div className="flex flex-1 items-center">
              <HawkErrorState offline onRetry={() => {}} />
            </div>
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=105-row-schedule name=Booking proposals group=Scenes — consumer
 * @HawkStates proposed accepted declined
 */
export function SceneBookings() {
  return (
    <PreviewPage
      title="Booking proposals"
      kicker="Scene · 105, 71"
      intro="A proposed time is a negotiation, not a fact — both parties can see who proposed it and what state it is in."
    >
      <PreviewStage>
        <div className="max-w-lg">
          <HawkList>
            <HawkKycItemRow label="Tue 3 Sep · 14:00" status={booking('pending')} description="Proposed by Chidi Nwosu" />
            <HawkKycItemRow label="Wed 4 Sep · 09:30" status={booking('confirmed')} />
            <HawkKycItemRow label="Mon 1 Sep · 16:00" status={booking('late_cancellation')} description="Cancelled 20 minutes before" />
            <HawkKycItemRow label="Fri 29 Aug · 11:00" status={booking('fulfilled')} />
          </HawkList>
        </div>
      </PreviewStage>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=149-pro-home-parts name=Pro-home composites group=Scenes — consumer
 * @HawkStates pass earnings rates
 */
export function SceneProHome() {
  return (
    <PreviewPage
      title="Pro-home composites"
      kicker="Scene · 149, 150"
      intro="The professional's pass, their earnings, and their rates — the three blocks the home screen composes."
    >
      <PreviewGrid columns={3}>
        <PreviewStage label="the pass" ground>
          <HawkPass.Root>
            <HawkPass.Body>
              <HawkIdentity name="Adaeze Okonkwo" subtitle="Tax & corporate law" size="lg" verified />
              <HawkFigure value={842_000} size="lg" />
              <HawkCaption>Earned this month</HawkCaption>
            </HawkPass.Body>
            <HawkPass.Perforation />
            <HawkPass.Stub>
              <HawkCaption>Rate</HawkCaption>
              <HawkPrice amountKobo={250_000} />
            </HawkPass.Stub>
            <HawkPass.Meta>
              <span>REF · OHL-4821</span>
              <span>22 Aug 2026</span>
            </HawkPass.Meta>
          </HawkPass.Root>
        </PreviewStage>

        <PreviewStage label="earnings" ground>
          <HawkBalanceCard balanceKobo={842_000} heldKobo={301_000} label="Available to withdraw" />
        </PreviewStage>

        <PreviewStage label="rates" ground>
          <HawkList>
            <HawkRateRow label="Standard consultation" amountKobo={250_000} minimumMinutes={15} onEdit={() => {}} />
            <HawkRateRow label="Extended review" amountKobo={400_000} minimumMinutes={30} active={false} onEdit={() => {}} />
          </HawkList>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=144-takeover name=Takeovers group=Scenes — consumer
 * @HawkStates congratulatory setup
 */
export function SceneTakeover() {
  return (
    <PreviewPage
      title="Full-screen takeovers"
      kicker="Scene · 144, 152, 163"
      intro="The one place the system permits celebration, and it stays restrained: a tick and a figure. A payments product that throws confetti at a ₦2,000 withdrawal reads as unserious about the money."
    >
      <PreviewGrid columns={2}>
        <PreviewStage label="congratulatory" ground className="p-hawk-4">
          <Phone>
            <div className="flex flex-1 items-center">
              <HawkSuccessMoment
                title="You are verified"
                description="Your profile is live and clients can find you."
                action={<HawkButton label="Set your rates" block onClick={() => {}} />}
                secondaryAction={<HawkButton label="Later" variant="ghost" block onClick={() => {}} />}
              />
            </div>
          </Phone>
        </PreviewStage>

        <PreviewStage label="setup" ground className="p-hawk-4">
          <Phone>
            <Scroll>
              <HawkHeading level={3}>Almost there</HawkHeading>
              <HawkProgressBar value={0.8} showValue label="Setup" />
              <HawkList carded={false}>
                <HawkTile title="Profile" subtitle="Done" icon={IconUser} />
                <HawkTile title="Rates" subtitle="Done" icon={IconReceipt} />
                <HawkTile title="Bank account" subtitle="Not started" icon={IconWallet} chevron onClick={() => {}} />
              </HawkList>
            </Scroll>
            <HawkContinueBar onContinue={() => {}} />
          </Phone>
        </PreviewStage>
      </PreviewGrid>
    </PreviewPage>
  );
}
