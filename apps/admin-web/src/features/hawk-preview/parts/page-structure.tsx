import {
  HawkAccordion,
  HawkBanner,
  HawkButton,
  HawkCallout,
  HawkCard,
  HawkContentBlock,
  HawkEmptyState,
  HawkErrorState,
  HawkFeedbackMessage,
  HawkHeading,
  HawkList,
  HawkLocked,
  HawkSectionHeader,
  HawkSemantic,
  HawkStepStatus,
  HawkStepperProgress,
  HawkStepperVertical,
  HawkSuccessMoment,
  HawkText,
  HawkTile,
  IconAlertTriangle,
  IconChat,
  IconCheck,
  IconLock,
  IconShield,
  IconWallet,
} from '@ohlify/hawk-ui';

import { PreviewGrid, PreviewPage, PreviewSection, PreviewStage } from './preview-shell.js';

/**
 * @HawkPage slug=136-card name=Cards, lists & locked group=Structure
 * @HawkStates flat sunken raised hero locked
 */
export function PageStructure() {
  return (
    <PreviewPage
      title="Cards, lists & locked"
      kicker="Structure · 136"
      intro="Four card variants, and one wrapper that handles every locked surface in the product."
    >
      <PreviewSection
        title="Card variants"
        rule="Raised is for content that genuinely floats — a popover, a sheet. A shadow on a card that sits still is decoration pretending to be hierarchy."
      >
        <PreviewGrid columns={4}>
          <PreviewStage label="flat">
            <HawkCard>
              <HawkText variant="body" ink="strong">
                Hairline on paper
              </HawkText>
              <HawkText variant="caption" ink="muted">
                The default. Almost everything.
              </HawkText>
            </HawkCard>
          </PreviewStage>

          <PreviewStage label="sunken" ground>
            <HawkCard variant="sunken">
              <HawkText variant="body" ink="strong">
                No border
              </HawkText>
              <HawkText variant="caption" ink="muted">
                Sits on the tinted stock instead.
              </HawkText>
            </HawkCard>
          </PreviewStage>

          <PreviewStage label="raised">
            <HawkCard variant="raised">
              <HawkText variant="body" ink="strong">
                Shadowed
              </HawkText>
              <HawkText variant="caption" ink="muted">
                Floating content only.
              </HawkText>
            </HawkCard>
          </PreviewStage>

          <PreviewStage label="hero">
            <HawkCard variant="hero">
              <HawkText variant="body" className="font-semibold">
                The violet hero
              </HawkText>
              <HawkText variant="caption">Reserved for the wallet balance.</HawkText>
            </HawkCard>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Section headers, lists and rows"
        rule="A list is carded and divided by default: the hairlines say where one row ends, which a gap alone leaves ambiguous."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="list of tiles">
            <div className="flex flex-col gap-hawk-5">
              <HawkSectionHeader
                title="Account"
                subtitle="Everything tied to this profile"
                action={<HawkButton label="See all" variant="ghost" size="sm" onClick={() => {}} />}
              />
              <HawkList>
                <HawkTile title="Wallet" subtitle="₦12,400 available" icon={IconWallet} chevron onClick={() => {}} />
                <HawkTile title="Messages" subtitle="2 unread" icon={IconChat} chevron onClick={() => {}} />
                <HawkTile title="Verification" subtitle="Approved" icon={IconShield} chevron onClick={() => {}} />
              </HawkList>
            </div>
          </PreviewStage>

          <PreviewStage label="accordion + prose">
            <div className="flex flex-col gap-hawk-5">
              <HawkAccordion title="What are minutes?" defaultOpen>
                <HawkContentBlock>
                  Minutes are prepaid talk time with a specific professional. They are held
                  against that professional and are not transferable, because the rate that
                  bought them was theirs.
                </HawkContentBlock>
              </HawkAccordion>
              <HawkAccordion title="Do minutes expire?" subtitle="Short answer: no">
                <HawkContentBlock>
                  Unused minutes stay on the account indefinitely.
                </HawkContentBlock>
              </HawkAccordion>
            </div>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Locked"
        rule="One cross-cutting wrapper rather than a locked variant on all 88 components. A locked surface always says why it is locked and what would unlock it — a disabled thing with no explanation is a dead end."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="locked">
            <HawkLocked
              reason="Verify your identity to withdraw."
              action={<HawkButton label="Verify now" size="sm" onClick={() => {}} />}
            >
              <HawkCard>
                <HawkText variant="body" ink="strong">
                  Withdraw to bank
                </HawkText>
                <HawkText variant="caption" ink="muted">
                  ₦12,400 available
                </HawkText>
              </HawkCard>
            </HawkLocked>
          </PreviewStage>

          <PreviewStage label="unlocked — the same subtree">
            <HawkLocked locked={false}>
              <HawkCard>
                <HawkText variant="body" ink="strong">
                  Withdraw to bank
                </HawkText>
                <HawkText variant="caption" ink="muted">
                  ₦12,400 available
                </HawkText>
              </HawkCard>
            </HawkLocked>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=106-callout name=Callouts, banners & toasts group=Feedback & overlays
 * @HawkStates neutral info success caution critical hazard
 */
export function PageFeedback() {
  return (
    <PreviewPage
      title="Callouts, banners & toasts"
      kicker="Feedback · 106"
      intro="A callout is attached to the content beside it; a banner is about the whole screen. Choosing the wrong one moves the message away from what it describes."
    >
      <PreviewSection
        title="Callouts"
        rule="Six semantics, and no seventh. Hazard is the system alarm-state and is never pressable — an alarm you can click is an alarm you can dismiss by accident."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="neutral">
            <HawkCallout message="Your next payout runs on Friday." />
          </PreviewStage>
          <PreviewStage label="info">
            <HawkCallout semantic={HawkSemantic.INFO} message="Calls are billed per second after the first minute." />
          </PreviewStage>
          <PreviewStage label="success">
            <HawkCallout semantic={HawkSemantic.SUCCESS} title="Verified" message="Your identity check passed." />
          </PreviewStage>
          <PreviewStage label="caution">
            <HawkCallout
              semantic={HawkSemantic.CAUTION}
              title="Low minutes"
              message="Under two minutes left with this professional."
              action={<HawkButton label="Top up" size="sm" onClick={() => {}} />}
            />
          </PreviewStage>
          <PreviewStage label="critical">
            <HawkCallout
              semantic={HawkSemantic.CRITICAL}
              icon={IconAlertTriangle}
              title="Payout failed"
              message="Your bank rejected the transfer. The money is back in your wallet."
            />
          </PreviewStage>
          <PreviewStage label="hazard">
            <HawkCallout
              hazard
              title="Account suspended"
              message="Contact support to restore access."
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Banners"
        rule="Screen-level, so they sit at the top edge and span it. A banner that only covers part of the width reads as a callout that has lost its content."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="banner — caution" ground>
            <HawkBanner
              semantic={HawkSemantic.CAUTION}
              message="You are offline · showing saved data"
            />
          </PreviewStage>
          <PreviewStage label="banner — critical with action" ground>
            <HawkBanner
              semantic={HawkSemantic.CRITICAL}
              title="Verification expired"
              message="Re-verify to keep accepting calls."
              action={<HawkButton label="Re-verify" size="sm" onClick={() => {}} />}
              onDismiss={() => {}}
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Inline feedback"
        rule="Stays where the action happened, unlike a toast. A form error at the edge of the screen is an error the user has to go looking for."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="success">
            <HawkFeedbackMessage
              semantic={HawkSemantic.SUCCESS}
              icon={IconCheck}
              title="Rate updated"
              message="Clients will see ₦2,500 per minute from now on."
            />
          </PreviewStage>
          <PreviewStage label="critical">
            <HawkFeedbackMessage
              semantic={HawkSemantic.CRITICAL}
              title="Could not save"
              message="That rate is below the platform minimum."
              action={<HawkButton label="Try again" size="sm" variant="ghost" onClick={() => {}} />}
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=109-empty-state name=Empty, error & success group=Feedback & overlays
 * @HawkStates empty error offline success step-done step-current step-pending step-failed
 */
export function PageStates() {
  return (
    <PreviewPage
      title="Empty, error & success"
      kicker="Feedback · 109"
      intro="The full-surface states, and the two steppers. Every one of them carries a way forward — a dead end is a bug, not a state."
    >
      <PreviewSection
        title="Empty and error"
        rule="An error state is for a cold cache only. When readable data already exists the error belongs in a thin banner above it: replacing content the user could still have used is a second failure on top of the first."
      >
        <PreviewGrid columns={3}>
          <PreviewStage label="empty">
            <HawkEmptyState
              icon={IconChat}
              title="No conversations yet"
              description="When you message a professional, your threads appear here."
              action={<HawkButton label="Browse professionals" pill onClick={() => {}} />}
            />
          </PreviewStage>

          <PreviewStage label="error">
            <HawkErrorState
              title="Could not load"
              description="Your conversations could not be fetched."
              onRetry={() => {}}
            />
          </PreviewStage>

          <PreviewStage label="offline">
            <HawkErrorState
              offline
              title="You are offline"
              description="Check your connection and try again."
              onRetry={() => {}}
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Success"
        rule="The figure that succeeded is the whole message, so it gets the record face and the room to be read at a glance."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="success">
            <HawkSuccessMoment
              title="Withdrawal sent"
              highlight="₦48,200"
              description="Arriving in your GTBank account within 10 minutes."
              action={<HawkButton label="Done" onClick={() => {}} />}
              secondaryAction={
                <HawkButton label="View receipt" variant="ghost" onClick={() => {}} />
              }
            />
          </PreviewStage>

          <PreviewStage label="locked surface">
            <HawkLocked
              reason="Add a bank account before withdrawing."
              action={<HawkButton label="Add account" size="sm" onClick={() => {}} />}
            >
              <HawkCard>
                <div className="flex items-center gap-hawk-4">
                  <HawkText variant="body" ink="strong" className="flex-1">
                    Withdraw
                  </HawkText>
                  <HawkText variant="caption" ink="muted">
                    ₦48,200
                  </HawkText>
                </div>
              </HawkCard>
            </HawkLocked>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Steppers"
        rule="Horizontal shows position in a flow; vertical shows what has already happened. A flow is not always a straight line, so a step can fail while the steps before it stand."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="step-current — horizontal">
            <div className="flex flex-col gap-hawk-6">
              <HawkStepperProgress
                steps={['Details', 'Documents', 'Selfie', 'Review']}
                current={1}
              />
              <HawkHeading level={3}>
                Upload your documents
              </HawkHeading>
            </div>
          </PreviewStage>

          <PreviewStage label="step-done · step-failed · step-pending">
            <HawkStepperVertical
              steps={[
                {
                  label: 'Requested',
                  timestamp: '14 Aug · 11:20',
                  status: HawkStepStatus.DONE,
                },
                {
                  label: 'Approved',
                  timestamp: '14 Aug · 11:42',
                  description: 'By finance_ops',
                  status: HawkStepStatus.DONE,
                },
                {
                  label: 'Sent to bank',
                  timestamp: '14 Aug · 11:43',
                  description: 'Rejected by GTBank — account name mismatch',
                  status: HawkStepStatus.FAILED,
                },
                {
                  label: 'Settled',
                  status: HawkStepStatus.PENDING,
                },
              ]}
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Locked, one more time"
        rule="The same wrapper as Structure 136 — repeated here because the locked state is a feedback state as much as a structural one."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="locked">
            <HawkLocked
              reason="This call has ended."
              action={<HawkButton label="Book another" size="sm" variant="ghost" onClick={() => {}} />}
            >
              <HawkList>
                <HawkTile title="Rejoin call" icon={IconLock} onClick={() => {}} />
              </HawkList>
            </HawkLocked>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>
    </PreviewPage>
  );
}
