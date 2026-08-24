import { useState } from 'react';

import {
  HawkAccordion,
  HawkBanner,
  HawkButton,
  HawkCallout,
  HawkCaption,
  HawkCard,
  HawkContentBlock,
  HawkCountdown,
  HawkEmptyState,
  HawkErrorState,
  HawkFeedbackMessage,
  HawkFigure,
  HawkFreshnessBanner,
  HawkList,
  HawkLocked,
  HawkSectionHeader,
  HawkStepperProgress,
  HawkStepperVertical,
  HawkSuccessMoment,
  HawkText,
  HawkTile,
  HawkToast,
  HawkTooltip,
  IconInfo,
  IconWallet,
  hawkToast,
} from '@ohlify/hawk-ui';

import {
  PreviewGrid,
  PreviewPage,
  PreviewSection,
  PreviewStage,
  PreviewState,
  PreviewStates,
} from './preview-shell.js';

/**
 * @HawkPage slug=136-card name=Cards, lists & locked group=Structure
 * @HawkStates flat sunken raised hero locked
 *
 * The containers, and the cross-cutting lock.
 */
export function PageStructure() {
  return (
    <PreviewPage
      title="Cards, lists & the locked state"
      kicker="Structure · 136–139, 145, 150, 155–156"
      intro="flat is the default rather than elevated. The system is hairline-first: shadow is reserved for things that genuinely float above the page."
    >
      <PreviewSection
        title="Card variants"
        rule="A page of shadowed cards makes nothing look raised, because everything is."
      >
        <PreviewGrid columns={2}>
          {(['flat', 'sunken', 'raised', 'hero'] as const).map((variant) => (
            <HawkCard key={variant} variant={variant}>
              <HawkText
                variant="label"
                ink={variant === 'hero' ? 'inverse' : 'strong'}
                className="font-semibold"
              >
                {variant}
              </HawkText>
            </HawkCard>
          ))}
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection title="Section headers, lists & tiles">
        <div className="flex flex-col gap-hawk-6">
          <HawkSectionHeader
            title="Recent calls"
            subtitle="Your last seven days"
            action={<HawkButton label="See all" variant="ghost" size="sm" onClick={() => {}} />}
          />
          <HawkList>
            <HawkTile title="Personal details" subtitle="Name, date of birth" icon={IconInfo} chevron onClick={() => {}} />
            <HawkTile title="Bank account" subtitle="GTBank ••••4821" icon={IconWallet} chevron onClick={() => {}} />
          </HawkList>
        </div>
      </PreviewSection>

      <PreviewSection
        title="Locked"
        rule="One cross-cutting wrapper, not 88 variants. The content stays visible beneath the hatch — hiding it entirely would leave the user unable to see what they are being offered, which is exactly the information that motivates them to unlock it."
      >
        <PreviewStage ground>
          <div className="max-w-sm">
            <HawkLocked
              reason="Verify your identity to start setting rates."
              action={<HawkButton label="Verify now" size="sm" onClick={() => {}} />}
            >
              <HawkCard>
                <div className="flex flex-col gap-hawk-4">
                  <HawkText variant="label" ink="strong">
                    Your rates
                  </HawkText>
                  <HawkFigure value={250_000} size="md" neverMasked />
                  <HawkCaption>per minute</HawkCaption>
                </div>
              </HawkCard>
            </HawkLocked>
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Accordion & content block">
        <PreviewGrid columns={2}>
          <PreviewStage label="accordion">
            <HawkAccordion title="How does billing work?" defaultOpen>
              <HawkText variant="caption" ink="muted">
                You are charged per second, and only while the call is connected. The
                amount is held from your balance when the call starts and settled when
                it ends.
              </HawkText>
            </HawkAccordion>
            <HawkAccordion title="When can I withdraw?">
              <HawkText variant="caption" ink="muted">
                Funds are released 24 hours after a call ends.
              </HawkText>
            </HawkAccordion>
          </PreviewStage>
          <PreviewStage label="content block">
            <HawkContentBlock>
              <h2>Terms of service</h2>
              <p>
                The one place the system relaxes its type rules: prose needs a
                comfortable measure and generous leading, which the component scale
                deliberately does not provide.
              </p>
              <ul>
                <li>Every other surface in the product is dense.</li>
                <li>Legal copy and FAQ answers are not.</li>
              </ul>
            </HawkContentBlock>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={4}>
        {(['flat', 'sunken', 'raised', 'hero'] as const).map((variant) => (
          <PreviewState key={variant} name={variant}>
            <HawkCard variant={variant}>
              <HawkText variant="caption" ink={variant === 'hero' ? 'inverse' : 'muted'}>
                {variant}
              </HawkText>
            </HawkCard>
          </PreviewState>
        ))}
        <PreviewState name="locked">
          <HawkLocked reason="Verify to unlock.">
            <HawkCard>
              <HawkCaption>Hidden behind the hatch</HawkCaption>
            </HawkCard>
          </HawkLocked>
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=106-callout name=Callouts, banners & toasts group=Feedback & overlays
 * @HawkStates neutral info success caution critical hazard
 *
 * The five-value enum as a surface treatment.
 */
export function PageFeedback() {
  return (
    <PreviewPage
      title="Callouts, banners & toasts"
      kicker="Feedback & overlays · 106–108, 148, 151, 154"
      intro="A toast does not get its own palette. It is a surface treatment of the shared semantic enum: soft background, onSoft text, base icon."
    >
      <PreviewSection
        title="Callout — attached to its content"
        rule="The pre-Hawk app had four toast background colours that disagreed with its own semantic colours (success #16A34A against toastSuccessBg #3FB12C). That is the exact failure the quartet prevents."
      >
        <div className="flex flex-col gap-hawk-4">
          {(['neutral', 'info', 'success', 'caution', 'critical'] as const).map((semantic) => (
            <HawkCallout
              key={semantic}
              semantic={semantic}
              title={semantic}
              message="Every tone-bearing component reads the same quartet."
            />
          ))}
          <HawkCallout
            hazard
            title="hazard"
            message="A system alarm-state, outside the enum. The user cannot press this away."
          />
        </div>
      </PreviewSection>

      <PreviewSection
        title="Banner — belongs to the chrome"
        rule="Full-bleed and square-cornered, which is what distinguishes it from a callout. The revamp decisions were explicit that these are banners, not popups — an interruption the user can read past beats one they must dismiss before continuing."
      >
        <PreviewStage className="p-0">
          <HawkBanner
            semantic="info"
            message="Scheduled maintenance tonight between 02:00 and 04:00."
            onDismiss={() => {}}
          />
          <HawkFreshnessBanner ageLabel="4 min ago" onRefresh={() => {}} />
          <HawkFreshnessBanner offline ageLabel="14:22" onRefresh={() => {}} />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Toast"
        note="Errors default to sticky. A failure the user missed because it timed out is a failure they will hit again."
      >
        <PreviewStage ground>
          <div className="flex flex-col gap-hawk-3">
            <HawkToast
              toast={{ id: '1', message: 'Rate saved.', semantic: 'success' }}
              onDismiss={() => {}}
            />
            <HawkToast
              toast={{
                id: '2',
                message: 'Could not reach the server.',
                semantic: 'critical',
                action: { label: 'Retry', onClick: () => {} },
              }}
              onDismiss={() => {}}
            />
          </div>
          <div className="mt-hawk-5 flex gap-hawk-3">
            <HawkButton
              label="Raise a toast"
              size="sm"
              variant="outline"
              onClick={() => hawkToast.success('Saved.')}
            />
            <HawkButton
              label="Raise an error"
              size="sm"
              variant="outline"
              destructive
              onClick={() => hawkToast.error('That did not work.')}
            />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Inline feedback">
        <PreviewGrid columns={2}>
          <HawkFeedbackMessage
            title="Too many attempts"
            message="Try again in 5 minutes."
          />
          <HawkFeedbackMessage
            semantic="success"
            title="Bank account verified"
            message="Withdrawals will be paid here."
          />
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={3}>
        {(['neutral', 'info', 'success', 'caution', 'critical'] as const).map((semantic) => (
          <PreviewState key={semantic} name={semantic}>
            <HawkCallout semantic={semantic} message="Message" />
          </PreviewState>
        ))}
        <PreviewState name="hazard">
          <HawkCallout hazard message="System alarm-state" />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=109-empty-state name=Empty, error & success group=Feedback & overlays
 * @HawkStates empty error offline success step-done step-current step-pending step-failed
 *
 * The three terminal states, and the countdown.
 */
export function PageStates() {
  const [step, setStep] = useState(1);

  return (
    <PreviewPage
      title="Empty, error & success"
      kicker="Feedback & overlays · 109–110, 118–120, 159"
      intro="An empty state always carries an action when one exists. 'No calls yet' is a dead end; 'No calls yet — find someone to talk to' is a screen the user can leave productively."
    >
      <PreviewSection title="Empty & error">
        <PreviewGrid columns={2}>
          <PreviewStage>
            <HawkEmptyState
              title="No calls yet"
              description="When you talk to someone, the call will show up here."
              action={<HawkButton label="Find a professional" size="sm" onClick={() => {}} />}
            />
          </PreviewStage>
          <PreviewStage>
            <HawkErrorState onRetry={() => {}} />
          </PreviewStage>
          <PreviewStage>
            <HawkErrorState offline onRetry={() => {}} />
          </PreviewStage>
          <PreviewStage>
            <HawkSuccessMoment
              title="Withdrawal sent"
              highlight={<HawkFigure value={8_420_000} size="lg" />}
              description="It should arrive in your GTBank account within 24 hours."
              action={<HawkButton label="Done" block onClick={() => {}} />}
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Countdown"
        rule="Escalates through hazard, not critical — the same rule as the meter. Time running out is something the system reports; it is not an irreversible action the user took."
      >
        <PreviewStage>
          <div className="flex flex-col gap-hawk-4">
            <HawkCountdown seconds={180} label="Code expires in" running={false} />
            <HawkCountdown seconds={22} label="Cancel window closes in" running={false} />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Steppers — horizontal and vertical"
        rule="Horizontal for compact flows, vertical where each step carries a timestamp. The distinction is what the step is *for*: the horizontal variant shows position, the vertical one shows history. Cramming a time under a horizontal rule truncates it at any realistic step count."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="horizontal — position">
            <div className="flex flex-col gap-hawk-5">
              <HawkStepperProgress
                steps={['Identity', 'Bank', 'Rates', 'Review']}
                current={step}
              />
              <div className="flex gap-hawk-3">
                <HawkButton label="Back" variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} />
                <HawkButton label="Next" size="sm" onClick={() => setStep((s) => Math.min(3, s + 1))} />
              </div>
            </div>
          </PreviewStage>
          <PreviewStage label="vertical — history">
            <HawkStepperVertical
              current={2}
              steps={[
                { label: 'Requested', timestamp: '14 Aug · 11:20' },
                { label: 'Approved by admin', timestamp: '14 Aug · 14:02' },
                { label: 'Sent to bank', description: 'In progress' },
                { label: 'Settled' },
              ]}
            />
          </PreviewStage>

          <PreviewStage label="vertical — a step that failed">
            <HawkStepperVertical
              steps={[
                { label: 'Requested', timestamp: '14 Aug · 11:20', status: 'done' },
                { label: 'Approved by admin', timestamp: '14 Aug · 14:02', status: 'done' },
                {
                  label: 'Sent to bank',
                  timestamp: '14 Aug · 14:05',
                  status: 'failed',
                  description: 'The account was closed. Funds returned to the wallet.',
                },
                { label: 'Settled', status: 'pending' },
              ]}
            />
          </PreviewStage>

          <PreviewStage label="tooltip — hover or focus">
            <HawkTooltip content="Funds are released 24 hours after a call ends.">
              <HawkButton label="Why is this held?" variant="outline" size="sm" onClick={() => {}} />
            </HawkTooltip>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="empty">
          <HawkEmptyState title="Nothing here" compact />
        </PreviewState>
        <PreviewState name="error">
          <HawkErrorState compact onRetry={() => {}} />
        </PreviewState>
        <PreviewState name="offline">
          <HawkErrorState offline compact onRetry={() => {}} />
        </PreviewState>
        <PreviewState name="success">
          <HawkSuccessMoment title="Done" />
        </PreviewState>
        <PreviewState name="step-done">
          <HawkStepperVertical steps={[{ label: 'Requested', timestamp: '11:20' }]} current={1} />
        </PreviewState>
        <PreviewState name="step-current">
          <HawkStepperVertical steps={[{ label: 'Sent to bank' }]} current={0} />
        </PreviewState>
        <PreviewState name="step-pending">
          <HawkStepperVertical steps={[{ label: 'Settled', status: 'pending' }]} />
        </PreviewState>
        <PreviewState name="step-failed" note="A flow is not always a straight line.">
          <HawkStepperVertical steps={[{ label: 'Sent to bank', status: 'failed' }]} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}
