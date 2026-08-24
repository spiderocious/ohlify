import { useState } from 'react';

import {
  HawkButton,
  HawkButtonDock,
  HawkButtonGroup,
  HawkChip,
  HawkContinueBar,
  HawkFab,
  HawkIconButton,
  HawkLink,
  HawkMenuLink,
  HawkNavLink,
  HawkQuickReplies,
  HawkSegmentedControl,
  HawkTalkToCta,
  IconBell,
  IconCheck,
  IconEdit,
  IconFilter,
  IconHome,
  IconLogOut,
  IconPlus,
  IconSettings,
  IconTrash,
  IconWallet,
} from '@ohlify/hawk-ui';

import {
  PreviewGrid,
  PreviewPage,
  PreviewRow,
  PreviewSection,
  PreviewStage,
  PreviewState,
  PreviewStates,
} from './preview-shell.js';

/**
 * @HawkPage slug=20-button name=Button group=Actions
 * @HawkStates default hover disabled loading destructive on-dark
 *
 * The button family — three independent axes, no escape hatches.
 */
export function PageButton() {
  return (
    <PreviewPage
      title="Button"
      kicker="Actions · 20–22, 34–35"
      intro="Four variants × destructive × onDark × size, resolved internally. Never a flat cross-product — there is no solid-destructive-on-dark enum member."
    >
      <PreviewSection
        title="Variants × sizes"
        rule="The pre-Hawk button accepted radius, height, padding, textStyle and borderColor. All five are gone: a button that accepts a textStyle has given up on being a design system. Size and register decide geometry."
      >
        <div className="flex flex-col gap-hawk-5">
          {(['solid', 'outline', 'plain', 'ghost'] as const).map((variant) => (
            <PreviewRow key={variant} label={variant}>
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <HawkButton key={size} label="Approve" variant={variant} size={size} onClick={() => {}} />
              ))}
            </PreviewRow>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Destructive — an independent axis"
        rule="The pre-Hawk AppButton had no destructive flag, which forced the confirmation modal to hand-roll a private _DestructiveButton — the most gravity-carrying button in the product, trapped inside one file."
      >
        <div className="flex flex-wrap gap-hawk-4">
          {(['solid', 'outline', 'plain', 'ghost'] as const).map((variant) => (
            <HawkButton
              key={variant}
              label="Delete account"
              variant={variant}
              destructive
              onClick={() => {}}
            />
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="On dark"
        note="The whole ladder inverts. Tinting the light-surface classes down never produces a legible result on the call screen or the violet hero."
      >
        <PreviewStage dark>
          <div className="flex flex-wrap gap-hawk-4">
            {(['solid', 'outline', 'plain', 'ghost'] as const).map((variant) => (
              <HawkButton key={variant} label="Continue" variant={variant} onDark onClick={() => {}} />
            ))}
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="With glyphs, block and pill">
        <div className="flex flex-col gap-hawk-4">
          <div className="flex flex-wrap gap-hawk-4">
            <HawkButton label="Add rate" startIcon={IconPlus} onClick={() => {}} />
            <HawkButton label="Confirm" endIcon={IconCheck} variant="outline" onClick={() => {}} />
            <HawkButton label="Filter" startIcon={IconFilter} variant="plain" pill onClick={() => {}} />
          </div>
          <HawkButton label="Continue" size="lg" block onClick={() => {}} />
        </div>
      </PreviewSection>

      <PreviewSection
        title="No hazard variant"
        rule="There is no act-now button. Hazard is a state the system reports; a user cannot press one. Irreversible operator actions use destructive, which is colder and deliberately distinct."
      >
        <div className="flex flex-wrap gap-hawk-4">
          <HawkButton label="Approve withdrawal" destructive onClick={() => {}} />
        </div>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="default">
          <HawkButton label="Approve" onClick={() => {}} />
        </PreviewState>
        <PreviewState name="hover" note="Hover the button to see it.">
          <HawkButton label="Approve" onClick={() => {}} />
        </PreviewState>
        <PreviewState name="disabled">
          <HawkButton label="Approve" disabled />
        </PreviewState>
        <PreviewState name="loading" note="Inert — the action is already in flight.">
          <HawkButton label="Approving" loading onClick={() => {}} />
        </PreviewState>
        <PreviewState name="destructive">
          <HawkButton label="Reject" destructive onClick={() => {}} />
        </PreviewState>
        <PreviewState name="on-dark" className="bg-hawk-call-ground">
          <HawkButton label="Continue" onDark onClick={() => {}} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=21-button-icon name=Icon button group=Actions
 * @HawkStates default active disabled loading
 *
 * Square by construction, with its own size scale.
 */
export function PageIconButton() {
  const [muted, setMuted] = useState(false);

  return (
    <PreviewPage
      title="Icon button"
      kicker="Actions · 21"
      intro="A separate component rather than a Button prop: it needs its own size scale (xs|sm|md|lg — one step finer, since a bare glyph reads smaller than a glyph beside a word)."
    >
      <PreviewSection
        title="Sizes and shapes"
        rule="`label` is required. A button whose entire content is a glyph is unlabelled to a screen reader, and making the accessible name optional is how an icon-only toolbar ships as a row of 'button, button, button'."
      >
        <div className="flex flex-col gap-hawk-5">
          <PreviewRow label="square">
            {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
              <HawkIconButton key={size} icon={IconEdit} label="Edit" size={size} onClick={() => {}} />
            ))}
          </PreviewRow>
          <PreviewRow label="circle">
            {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
              <HawkIconButton
                key={size}
                icon={IconEdit}
                label="Edit"
                shape="circle"
                size={size}
                onClick={() => {}}
              />
            ))}
          </PreviewRow>
          <PreviewRow label="variants">
            {(['solid', 'outline', 'plain', 'ghost'] as const).map((variant) => (
              <HawkIconButton
                key={variant}
                icon={IconSettings}
                label="Settings"
                variant={variant}
                onClick={() => {}}
              />
            ))}
          </PreviewRow>
          <PreviewRow label="destructive">
            <HawkIconButton icon={IconTrash} label="Delete" destructive onClick={() => {}} />
            <HawkIconButton icon={IconTrash} label="Delete" destructive variant="plain" onClick={() => {}} />
          </PreviewRow>
        </div>
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="default">
          <HawkIconButton icon={IconBell} label="Notifications" onClick={() => {}} />
        </PreviewState>
        <PreviewState name="active" note="A toggle, like mute.">
          <HawkIconButton
            icon={IconBell}
            label="Notifications"
            active={muted}
            onClick={() => setMuted((m) => !m)}
          />
        </PreviewState>
        <PreviewState name="disabled">
          <HawkIconButton icon={IconBell} label="Notifications" disabled />
        </PreviewState>
        <PreviewState name="loading">
          <HawkIconButton icon={IconBell} label="Notifications" loading />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=25-button-filter name=Chip & segmented group=Actions
 * @HawkStates default selected disabled removable
 *
 * Selection controls that are not buttons.
 */
export function PageChip() {
  const [selected, setSelected] = useState<string[]>(['pending']);
  const [segment, setSegment] = useState<'all' | 'audio' | 'video'>('all');

  const toggle = (value: string) =>
    setSelected((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );

  return (
    <PreviewPage
      title="Chip & segmented control"
      kicker="Actions · 25–26"
      intro="A chip is pressable and carries selection; a badge reports a status and is inert. The pre-Hawk app used one AppTag for both, which is why a status pill and a filter looked identical while behaving completely differently."
    >
      <PreviewSection title="Filter chips">
        <div className="flex flex-wrap gap-hawk-3">
          {[
            ['pending', 'Pending', 12],
            ['approved', 'Approved', 48],
            ['rejected', 'Rejected', 3],
            ['failed', 'Failed', 0],
          ].map(([value, label, count]) => (
            <HawkChip
              key={String(value)}
              label={String(label)}
              count={Number(count)}
              selected={selected.includes(String(value))}
              onClick={() => toggle(String(value))}
            />
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Segmented control"
        note="Implemented as a tablist, which is the accurate role: it switches which content is shown rather than submitting anything. Arrow keys move between segments."
      >
        <HawkSegmentedControl
          segments={[
            { value: 'all', label: 'All', count: 63 },
            { value: 'audio', label: 'Audio', count: 51 },
            { value: 'video', label: 'Video', count: 12 },
          ]}
          value={segment}
          onChange={setSegment}
          aria-label="Call type"
        />
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="default">
          <HawkChip label="Pending" onClick={() => {}} />
        </PreviewState>
        <PreviewState name="selected">
          <HawkChip label="Pending" selected onClick={() => {}} />
        </PreviewState>
        <PreviewState name="disabled">
          <HawkChip label="Pending" disabled onClick={() => {}} />
        </PreviewState>
        <PreviewState name="removable">
          <HawkChip label="Tax law" selected onRemove={() => {}} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=27-link-nav name=Links group=Actions
 * @HawkStates inline nav menu
 *
 * Three genuinely different shapes.
 */
export function PageLink() {
  return (
    <PreviewPage
      title="Links"
      kicker="Actions · 27–29"
      intro="Three shapes rather than one component with a kind prop — each has a different hit area, a different affordance and a different place in the reading order."
    >
      <PreviewSection
        title="Inline"
        note="Underlined on hover rather than always: a paragraph carrying three permanently-underlined links reads as damaged text."
      >
        <PreviewStage>
          <p className="text-hawk-body text-hawk-ink">
            Your withdrawal is being processed. <HawkLink onClick={() => {}}>Track it here</HawkLink>{' '}
            or <HawkLink onClick={() => {}}>contact support</HawkLink> if it takes longer than a day.
          </p>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Nav — full-row hit area, selection state">
        <PreviewStage>
          <div className="flex max-w-xs flex-col gap-hawk-1">
            <HawkNavLink label="Dashboard" icon={IconHome} active onClick={() => {}} />
            <HawkNavLink label="Wallet" icon={IconWallet} onClick={() => {}} />
            <HawkNavLink label="Settings" icon={IconSettings} onClick={() => {}} />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Menu"
        note="Carries the chevron by default because these rows navigate. `noChevron` is for rows that act in place, where a chevron would promise a screen that never arrives."
      >
        <PreviewStage>
          <div className="flex max-w-md flex-col divide-y divide-hawk-line">
            <HawkMenuLink
              label="Personal details"
              description="Name, date of birth, address"
              icon={IconSettings}
              onClick={() => {}}
            />
            <HawkMenuLink
              label="Bank account"
              description="Where withdrawals are paid"
              icon={IconWallet}
              onClick={() => {}}
            />
            <HawkMenuLink label="Sign out" icon={IconLogOut} destructive noChevron onClick={() => {}} />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="inline">
          <HawkLink onClick={() => {}}>Track it here</HawkLink>
        </PreviewState>
        <PreviewState name="nav">
          <HawkNavLink label="Wallet" icon={IconWallet} active onClick={() => {}} />
        </PreviewState>
        <PreviewState name="menu">
          <HawkMenuLink label="Bank account" icon={IconWallet} onClick={() => {}} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=30-cta-talk-to name=CTAs & docks group=Actions
 * @HawkStates default disabled blocked
 *
 * The conversion actions and the pinned bars.
 */
export function PageCta() {
  return (
    <PreviewPage
      title="CTAs, docks & the FAB"
      kicker="Actions · 24, 30–33"
      intro="The product's primary conversion action, and the surfaces that pin actions to the bottom of a screen."
    >
      <PreviewSection
        title="Talk-to CTA"
        rule="Shows the price beside the action, always. A per-second billing product that hides the rate behind a tap is asking the user to commit money blind — the same instinct as the evidence rule on the Pass."
      >
        <PreviewStage>
          <div className="max-w-md">
            <HawkTalkToCta
              name="Adaeze Okonkwo"
              ratePerMinuteKobo={250_000}
              videoAvailable
              onAudio={() => {}}
              onVideo={() => {}}
            />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Unavailable, with a reason">
        <PreviewStage>
          <div className="max-w-md">
            <HawkTalkToCta
              name="Adaeze Okonkwo"
              ratePerMinuteKobo={250_000}
              disabled
              unavailableReason="Adaeze is on another call. We will let you know when she is free."
            />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Continue bar"
        rule="The hint slot exists because the alternative is worse: a disabled Continue with no explanation is the single most common dead end in an onboarding flow. If the button is off, the bar says why."
      >
        <PreviewStage ground className="p-0">
          <HawkContinueBar
            disabled
            hint="Add at least one rate before continuing."
            secondaryLabel="Skip"
            onContinue={() => {}}
            onSecondary={() => {}}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Button dock & group">
        <PreviewGrid columns={2}>
          <PreviewStage label="dock" className="p-0">
            <HawkButtonDock>
              <HawkButton label="Save changes" block onClick={() => {}} />
            </HawkButtonDock>
          </PreviewStage>
          <PreviewStage label="group">
            <HawkButtonGroup>
              <HawkButton label="Cancel" variant="ghost" onClick={() => {}} />
              <HawkButton label="Approve" onClick={() => {}} />
            </HawkButtonGroup>
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection title="FAB & quick replies">
        <PreviewGrid columns={2}>
          <PreviewStage label="fab">
            <div className="flex gap-hawk-5">
              <HawkFab label="New rate" onClick={() => {}} />
              <HawkFab label="New rate" extended onClick={() => {}} />
            </div>
          </PreviewStage>
          <PreviewStage label="quick replies">
            <HawkQuickReplies
              replies={['On my way', 'Give me 5 minutes', 'Can we reschedule?']}
              onSelect={() => {}}
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="default">
          <HawkButton label="Start call" onClick={() => {}} />
        </PreviewState>
        <PreviewState name="disabled">
          <HawkButton label="Start call" disabled />
        </PreviewState>
        <PreviewState name="blocked" note="Disabled with the reason stated.">
          <div className="flex flex-col gap-hawk-2">
            <HawkButton label="Start call" disabled block />
            <span className="text-hawk-tiny text-hawk-ink-muted">Top up to start a call.</span>
          </div>
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}
