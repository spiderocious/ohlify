import { IconBack, IconMail, IconPhone } from '@icons';
import {
  Case,
  Clamp,
  CopyToClipboard,
  Default,
  Hidden,
  Loadable,
  Repeat,
  Show,
  Switch,
} from 'meemaw';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { MOCK_CATEGORIES, MOCK_PROFESSIONALS, MOCK_UPCOMING_CALLS, ROUTES } from '@ohlify/core';
import {
  AppBanner,
  AppButton,
  AppDateInput,
  AppDropdownInput,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppIconButton,
  AppLoader,
  AppMultiSelectDropdown,
  AppOtpInput,
  AppPhoneInput,
  AppSearchBar,
  AppTabView,
  AppTag,
  AppText,
  AppTextAreaInput,
  AppTextInput,
  AppToast,
  CategoryFilterBar,
  DrawerService,
  KycItemTile,
  KycProgressHeader,
  ProfessionalHeader,
  ProfessionalListTile,
  ProfessionalRating,
  ScreenContinueBar,
  SectionHeader,
  UpcomingCallCard,
  appMainNavItems,
  AppBottomNavBar,
  type AppTextVariant,
  type DropdownOption,
} from '@ohlify/ui';

import { Section } from './parts/section.js';

const TEXT_VARIANTS: AppTextVariant[] = [
  'title',
  'header',
  'subtitle',
  'subheader',
  'medium',
  'bodyTitle',
  'body',
  'bodyNormal',
  'bodySmall',
  'bodySmallest',
  'label',
];

const COUNTRY_OPTIONS: DropdownOption<string>[] = [
  { label: 'Nigeria', value: 'NG' },
  { label: 'Ghana', value: 'GH' },
  { label: 'Kenya', value: 'KE' },
  { label: 'South Africa', value: 'ZA' },
];

const INTEREST_OPTIONS: DropdownOption<string>[] = [
  { label: 'Relationship', value: 'Relationship' },
  { label: 'Technology', value: 'Technology' },
  { label: 'Entertainment', value: 'Entertainment' },
  { label: 'Career', value: 'Career' },
  { label: 'Health', value: 'Health' },
];

export function ComponentPreviewScreen() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [country, setCountry] = useState<string>('NG');
  const [interests, setInterests] = useState<string[]>(['Relationship', 'Technology']);
  const [date, setDate] = useState<Date | undefined>(undefined);

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link
            to={ROUTES.ROOT.absPath}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
          >
            <IconBack size={16} />
            Back
          </Link>
          <span className="flex-1" />
          <AppText variant="bodySmall" color="var(--ohl-text-muted)">
            packages/ui · primitives
          </AppText>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <AppText as="h1" variant="title">
          Component preview
        </AppText>
        <AppText as="p" variant="body" align="start" className="mt-2 text-text-muted">
          Each section ports a widget from <code>mobile/lib/ui/widgets/</code>. Visual parity is the
          contract — if anything looks off vs the Flutter app, file it.
        </AppText>

        <Section title="AppText" mobileFile="app_text/app_text.dart">
          <div className="space-y-3">
            <Repeat each={TEXT_VARIANTS}>
              {(v) => (
                <div key={v} className="flex items-baseline gap-3">
                  <span className="w-28 shrink-0 font-mono text-xs text-text-muted">{v}</span>
                  <AppText variant={v}>The quick brown fox jumps over the lazy dog</AppText>
                </div>
              )}
            </Repeat>
          </div>
        </Section>

        <Section title="AppButton" mobileFile="app_button/app_button.dart">
          <div className="flex flex-wrap gap-3">
            <AppButton label="Solid" onPressed={() => undefined} />
            <AppButton label="Outline" variant="outline" onPressed={() => undefined} />
            <AppButton label="Plain" variant="plain" onPressed={() => undefined} />
            <AppButton label="Subtle" variant="subtle" bordered onPressed={() => undefined} />
            <AppButton label="Loading" isLoading onPressed={() => undefined} />
            <AppButton label="Disabled" isDisabled onPressed={() => undefined} />
          </div>
          <div className="mt-4">
            <AppButton
              label="Continue"
              expanded
              radius={100}
              endIcon={<IconBack size={20} style={{ transform: 'rotate(180deg)' }} />}
              onPressed={() => undefined}
            />
          </div>
        </Section>

        <Section title="AppIconButton" mobileFile="app_icon_button/app_icon_button.dart">
          <div className="flex flex-wrap items-end gap-3">
            <AppIconButton
              icon={<IconPhone color="#fff" size={22} />}
              onPressed={() => undefined}
              ariaLabel="Call"
            />
            <AppIconButton
              icon={<IconPhone color="var(--ohl-primary)" size={22} />}
              variant="outline"
              onPressed={() => undefined}
              ariaLabel="Outline"
            />
            <AppIconButton
              icon={<IconMail color="var(--ohl-text-jet)" size={22} />}
              variant="ghost"
              shape="squircle"
              onPressed={() => undefined}
              ariaLabel="Mail"
            />
            <AppIconButton
              icon={<IconPhone color="#fff" size={20} />}
              size={40}
              onPressed={() => undefined}
              ariaLabel="Small"
            />
          </div>
        </Section>

        <Section title="AppTextInput" mobileFile="app_text_input/app_text_input.dart">
          <div className="grid gap-4 sm:grid-cols-2">
            <AppTextInput
              label="Email address"
              placeholder="adedeji@example.com"
              value={name}
              onChange={setName}
              startIcon={<IconMail size={18} />}
            />
            <AppTextInput
              label="Password"
              placeholder="Enter password"
              obscureText
              endIcon={<span className="text-xs text-text-slate">show</span>}
            />
            <AppTextInput
              label="With error"
              value="not-an-email"
              errorMessage="Please enter a valid email address."
            />
            <AppTextInput label="Disabled" disabled value="Locked" />
          </div>
        </Section>

        <Section title="AppTextAreaInput" mobileFile="app_text_area_input/app_text_area_input.dart">
          <AppTextAreaInput
            label="Bio"
            placeholder="Tell us about yourself..."
            value={bio}
            onChange={setBio}
          />
        </Section>

        <Section title="AppPhoneInput" mobileFile="app_phone_input/app_phone_input.dart">
          <div className="grid gap-4 sm:grid-cols-2">
            <AppPhoneInput label="Phone number" value={phone} onChange={setPhone} />
            <AppPhoneInput label="With caret" canSelectCountryCode />
          </div>
        </Section>

        <Section title="AppOtpInput" mobileFile="app_otp_input/app_otp_input.dart">
          <AppOtpInput onChange={setOtp} onComplete={() => undefined} />
          <p className="mt-2 text-xs text-text-muted">
            Current value:{' '}
            <Show when={otp.length > 0} fallback={<>—</>}>
              <code>{otp}</code>
            </Show>
          </p>
        </Section>

        <Section title="AppSearchBar" mobileFile="app_search_bar/app_search_bar.dart">
          <div className="space-y-3">
            <AppSearchBar placeholder="IconSearch professional" />
            <AppSearchBar
              readOnly
              placeholder="Tap to search (read-only)"
              onTap={() => undefined}
            />
          </div>
        </Section>

        <Section title="AppDropdownInput" mobileFile="app_dropdown_input/app_dropdown_input.dart">
          <div className="grid gap-4 sm:grid-cols-2">
            <AppDropdownInput
              label="Country"
              options={COUNTRY_OPTIONS}
              value={country}
              onChange={setCountry}
              bordered
            />
            <AppDropdownInput
              label="Country (searchable)"
              options={COUNTRY_OPTIONS}
              searchable
              bordered
              placeholder="Pick a country"
            />
          </div>
        </Section>

        <Section
          title="AppMultiSelectDropdown"
          mobileFile="app_multi_select_dropdown/app_multi_select_dropdown.dart"
        >
          <AppMultiSelectDropdown
            label="Interests"
            options={INTEREST_OPTIONS}
            selected={interests}
            onChange={setInterests}
            allowOther
          />
        </Section>

        <Section title="AppDateInput" mobileFile="app_date_input/app_date_input.dart">
          <AppDateInput label="Schedule date" value={date} onChange={setDate} weekendDisabled />
        </Section>

        <Section title="AppTag" mobileFile="app_tag/app_tag.dart">
          <div className="flex flex-wrap items-center gap-2">
            <AppTag label="OUTLINE" />
            <AppTag label="SOLID" variant="solid" />
            <AppTag label="SUBTLE" variant="subtle" />
            <AppTag label="SURFACE" variant="surface" />
            <AppTag label="SMALL" size="small" />
            <AppTag label="LARGE" size="large" />
            <AppTag label="SQUARE" radius="small" />
            <AppTag
              label="AUDIO"
              variant="solid"
              color="#8F089B"
              startIcon={<IconPhone size={12} />}
            />
            <AppTag
              label="REMOVE ME"
              endIcon={<span aria-hidden="true">×</span>}
              onTap={() => undefined}
            />
          </div>
        </Section>

        <Section title="AppLoader" mobileFile="app_loader/app_loader.dart">
          <div className="rounded-md border border-border p-6">
            <AppLoader />
          </div>
        </Section>

        <Section
          title="AppErrorState / AppEmptyState"
          mobileFile="app_error_state/app_error_state.dart"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border p-6">
              <AppErrorState message="Failed to load professionals." />
            </div>
            <div className="rounded-md border border-border p-6">
              <AppEmptyState message="No calls yet." />
            </div>
          </div>
        </Section>

        <Section title="AppToast" mobileFile="app_toast/app_toast.dart">
          <div className="space-y-3">
            <AppToast type="success" message="Withdrawal request submitted." />
            <AppToast type="error" message="Could not connect — please try again." />
            <AppToast type="warning" message="Your KYC will expire in 3 days." />
            <AppToast type="info" message="A new feature is available." dismissible={false} />
          </div>
        </Section>

        <Section
          title="DrawerService — Feedback modal"
          mobileFile="app_feedback_modal/app_feedback_modal.dart"
        >
          <p className="mb-3 font-sans text-xs text-text-muted">
            Position: where the panel is anchored. <code>center</code> dialog · <code>top</code>{' '}
            banner · <code>bottom</code> sheet (right drawer ≥lg) · <code>fullscreen</code>{' '}
            takeover.
          </p>
          <div className="flex flex-wrap gap-3">
            <AppButton
              label="Center · success"
              variant="plain"
              onPressed={() =>
                DrawerService.showFeedbackModal(
                  'Withdrawal requested',
                  'You have successfully submitted a withdrawal request for ₦20,000.00.',
                  { kind: 'success', position: 'center' },
                )
              }
            />
            <AppButton
              label="Center · error"
              variant="plain"
              onPressed={() =>
                DrawerService.showFeedbackModal('Could not save', 'Please try again later.', {
                  kind: 'error',
                  position: 'center',
                })
              }
            />
            <AppButton
              label="Top · warning"
              variant="plain"
              onPressed={() =>
                DrawerService.showFeedbackModal('Heads up', 'You have one unsaved change.', {
                  kind: 'warning',
                  position: 'top',
                })
              }
            />
            <AppButton
              label="Bottom · info"
              variant="plain"
              onPressed={() =>
                DrawerService.showFeedbackModal(
                  'Did you know?',
                  'You can share your professional profile from the home screen.',
                  { kind: 'info', position: 'bottom' },
                )
              }
            />
            <AppButton
              label="Fullscreen · success"
              variant="plain"
              onPressed={() =>
                DrawerService.showFeedbackModal(
                  'Role saved successfully',
                  'You are all set as a Professional. Let’s complete your profile next.',
                  {
                    kind: 'success',
                    position: 'fullscreen',
                    showCloseButton: false,
                    confirmButtonText: 'Complete my profile',
                  },
                )
              }
            />
          </div>
        </Section>

        <Section
          title="DrawerService — Confirmation modal"
          mobileFile="app_confirmation_modal/app_confirmation_modal.dart"
        >
          <div className="flex flex-wrap gap-3">
            <AppButton
              label="Center · neutral"
              variant="plain"
              onPressed={() =>
                DrawerService.showConfirmationModal(
                  'Continue as Professional?',
                  'You can change this later from your profile settings.',
                  { kind: 'neutral', position: 'center', confirmButtonText: 'Yes, continue' },
                )
              }
            />
            <AppButton
              label="Center · destructive"
              variant="plain"
              onPressed={() =>
                DrawerService.showConfirmationModal(
                  'Delete account?',
                  'This cannot be undone. Your account and call history will be permanently removed.',
                  {
                    kind: 'error',
                    destructive: true,
                    position: 'center',
                    confirmButtonText: 'Yes, delete',
                    cancelButtonText: 'Cancel',
                  },
                )
              }
            />
            <AppButton
              label="Top · warning"
              variant="plain"
              onPressed={() =>
                DrawerService.showConfirmationModal(
                  'Discard changes?',
                  'Your edits will be lost.',
                  { kind: 'warning', position: 'top', confirmButtonText: 'Discard' },
                )
              }
            />
            <AppButton
              label="Bottom · info"
              variant="plain"
              onPressed={() =>
                DrawerService.showConfirmationModal(
                  'Switch role',
                  'Pick a role to see the matching profile.',
                  { kind: 'info', position: 'bottom', confirmButtonText: 'Switch' },
                )
              }
            />
            <AppButton
              label="Fullscreen · destructive"
              variant="plain"
              onPressed={() =>
                DrawerService.showConfirmationModal(
                  'Permanently leave?',
                  'You will lose access to your scheduled calls.',
                  {
                    kind: 'error',
                    destructive: true,
                    position: 'fullscreen',
                    confirmButtonText: 'Yes, leave',
                    cancelButtonText: 'Stay',
                  },
                )
              }
            />
          </div>
        </Section>

        <Section
          title="DrawerService — Input modal"
          mobileFile="app_input_modal/app_input_modal.dart"
        >
          <div className="flex flex-wrap gap-3">
            <AppButton
              label="Center · text"
              variant="plain"
              onPressed={() =>
                DrawerService.showInputModal(
                  'Edit display name',
                  'This is what professionals see on your profile.',
                  {
                    placeholder: 'Adedeji Bamidele',
                    confirmButtonText: 'Save',
                    position: 'center',
                  },
                )
              }
            />
            <AppButton
              label="Top · email"
              variant="plain"
              onPressed={() =>
                DrawerService.showInputModal(
                  'New email address',
                  'We will send a one-time code to verify.',
                  { inputType: 'email', placeholder: 'you@example.com', position: 'top' },
                )
              }
            />
            <AppButton
              label="Bottom · multiline"
              variant="plain"
              onPressed={() =>
                DrawerService.showInputModal(
                  'About you',
                  'Tell potential clients a bit about your background.',
                  { multiline: true, placeholder: 'Senior sales manager…', position: 'bottom' },
                )
              }
            />
            <AppButton
              label="Fullscreen · password"
              variant="plain"
              onPressed={() =>
                DrawerService.showInputModal(
                  'Change password',
                  'Enter the new password you want to use going forward.',
                  {
                    inputType: 'password',
                    placeholder: '••••••••',
                    position: 'fullscreen',
                    stepLabel: '1/2',
                  },
                )
              }
            />
          </div>
        </Section>

        <Section
          title="DrawerService — Custom modal"
          mobileFile="app_custom_modal/app_custom_modal.dart"
        >
          <div className="flex flex-wrap gap-3">
            <AppButton
              label="Center"
              variant="plain"
              onPressed={() =>
                DrawerService.showCustomModal(
                  'Withdraw funds',
                  () => (
                    <div className="space-y-4">
                      <AppTextInput label="Amount" placeholder="0" charSupported="number" />
                      <AppButton
                        label="Withdraw"
                        expanded
                        radius={100}
                        onPressed={() => undefined}
                      />
                    </div>
                  ),
                  { position: 'center' },
                )
              }
            />
            <AppButton
              label="Top"
              variant="plain"
              onPressed={() =>
                DrawerService.showCustomModal(
                  'Quick filter',
                  () => (
                    <div className="space-y-4">
                      <AppDropdownInput bordered options={COUNTRY_OPTIONS} placeholder="Country" />
                      <AppButton label="Apply" expanded radius={100} onPressed={() => undefined} />
                    </div>
                  ),
                  { position: 'top' },
                )
              }
            />
            <AppButton
              label="Bottom (sheet · drawer ≥lg)"
              variant="plain"
              onPressed={() =>
                DrawerService.showCustomModal(
                  'Schedule call',
                  () => (
                    <div className="space-y-4">
                      <AppDateInput label="Pick a date" weekendDisabled />
                      <AppButton
                        label="Schedule"
                        expanded
                        radius={100}
                        onPressed={() => undefined}
                      />
                    </div>
                  ),
                  { position: 'bottom' },
                )
              }
            />
            <AppButton
              label="Fullscreen"
              variant="plain"
              onPressed={() =>
                DrawerService.showCustomModal(
                  'Verify identity',
                  () => (
                    <div className="space-y-4">
                      <AppOtpInput onComplete={() => undefined} />
                      <AppButton
                        label="Continue"
                        expanded
                        radius={100}
                        onPressed={() => undefined}
                      />
                    </div>
                  ),
                  { position: 'fullscreen' },
                )
              }
            />
          </div>
        </Section>

        <Section title="DrawerService — Toasts" mobileFile="app_toast/app_toast.dart">
          <div className="flex flex-wrap gap-3">
            <AppButton
              label="Toast (success)"
              variant="plain"
              onPressed={() => DrawerService.toast('Profile updated.', { type: 'success' })}
            />
            <AppButton
              label="Toast (error)"
              variant="plain"
              onPressed={() =>
                DrawerService.toast('Could not connect — please try again.', { type: 'error' })
              }
            />
            <AppButton
              label="Toast (warning)"
              variant="plain"
              onPressed={() =>
                DrawerService.toast('Your KYC will expire in 3 days.', { type: 'warning' })
              }
            />
            <AppButton
              label="Toast (bottom)"
              variant="plain"
              onPressed={() =>
                DrawerService.toast('Saved as draft.', { type: 'info', position: 'bottom' })
              }
            />
            <AppButton
              label="Toast (sticky)"
              variant="plain"
              onPressed={() =>
                DrawerService.toast('You are offline.', { type: 'warning', sticky: true })
              }
            />
          </div>
        </Section>

        <Section
          title="ScreenContinueBar"
          mobileFile="screen_continue_bar/screen_continue_bar.dart"
        >
          <div className="overflow-hidden rounded-md border border-border">
            <ScreenContinueBar onPressed={() => undefined} />
          </div>
          <div className="mt-3 overflow-hidden rounded-md border border-border opacity-70">
            <ScreenContinueBar label="Login" />
          </div>
        </Section>

        <Section title="AppHeader" mobileFile="app_header/app_header.dart">
          <div className="overflow-hidden rounded-md border border-border">
            <AppHeader
              notificationCount={1}
              onCopyLink={() => undefined}
              onNotification={() => undefined}
            />
          </div>
        </Section>

        <Section title="AppBottomNavBar" mobileFile="app_bottom_nav_bar/app_bottom_nav_bar.dart">
          <div className="overflow-hidden rounded-md border border-border">
            <AppBottomNavBar items={appMainNavItems} currentIndex={0} onTap={() => undefined} />
          </div>
        </Section>

        <Section title="AppBanner" mobileFile="app_banner/app_banner.dart">
          <div className="grid gap-3 sm:grid-cols-2">
            <AppBanner variant="primary">
              <AppText weight={600}>Primary banner</AppText>
              <AppText variant="bodyNormal" color="var(--ohl-text-muted)" align="start">
                Secondary description here.
              </AppText>
            </AppBanner>
            <AppBanner variant="success">
              <AppText weight={600}>Success banner</AppText>
            </AppBanner>
            <AppBanner variant="warning">
              <AppText weight={600}>Warning banner</AppText>
            </AppBanner>
            <AppBanner variant="info">
              <AppText weight={600}>Info banner</AppText>
            </AppBanner>
          </div>
        </Section>

        <Section title="AppTabView" mobileFile="app_tab_view/app_tab_view.dart">
          <AppTabView
            tabs={[
              {
                label: 'Scheduled calls',
                child: <p className="font-sans text-sm text-text-muted">Scheduled tab body.</p>,
              },
              {
                label: 'Completed calls',
                child: <p className="font-sans text-sm text-text-muted">Completed tab body.</p>,
              },
            ]}
          />
        </Section>

        <Section title="SectionHeader" mobileFile="section_header/section_header.dart">
          <SectionHeader title="Popular professionals" onViewAll={() => undefined} />
        </Section>

        <Section
          title="ProfessionalRating"
          mobileFile="professional_rating/professional_rating.dart"
        >
          <div className="flex flex-col gap-3">
            <ProfessionalRating rating={4.9} reviewCount={187} />
            <ProfessionalRating rating={4.9} reviewCount={187} showDivider />
          </div>
        </Section>

        <Section
          title="CategoryFilterBar"
          mobileFile="category_filter_bar/category_filter_bar.dart"
        >
          <CategoryFilterBar
            categories={MOCK_CATEGORIES.map((c) => c.label)}
            selected={MOCK_CATEGORIES[0]?.label ?? 'All'}
            onSelect={() => undefined}
          />
        </Section>

        <Section title="UpcomingCallCard" mobileFile="upcoming_call_card/upcoming_call_card.dart">
          <div className="flex gap-3 overflow-x-auto">
            {MOCK_UPCOMING_CALLS.map((c) => (
              <UpcomingCallCard
                key={c.id}
                name={c.name}
                role={c.role}
                rating={c.rating}
                reviewCount={c.reviewCount}
                onTap={() => undefined}
              />
            ))}
          </div>
        </Section>

        <Section
          title="ProfessionalListTile"
          mobileFile="professional_list_tile/professional_list_tile.dart"
        >
          <div className="flex flex-col gap-3">
            {MOCK_PROFESSIONALS.slice(0, 3).map((p) => (
              <ProfessionalListTile
                key={p.id}
                name={p.name}
                role={p.role}
                rating={p.rating}
                reviewCount={p.reviewCount}
                onSchedule={() => undefined}
                onTap={() => undefined}
              />
            ))}
          </div>
        </Section>

        <Section
          title="ProfessionalHeader"
          mobileFile="professional_header/professional_header.dart"
        >
          <div className="overflow-hidden rounded-md">
            {MOCK_PROFESSIONALS[0] ? (
              <ProfessionalHeader
                name={MOCK_PROFESSIONALS[0].name}
                role={MOCK_PROFESSIONALS[0].role}
                rating={MOCK_PROFESSIONALS[0].rating}
                onBack={() => undefined}
                onReviewsTap={() => undefined}
              />
            ) : null}
          </div>
        </Section>

        <Section
          title="KycProgressHeader"
          mobileFile="kyc_progress_header/kyc_progress_header.dart"
        >
          <KycProgressHeader completed={5} total={8} percent={62} />
        </Section>

        <Section
          title="meemaw — declarative helpers"
          mobileFile="(no mobile equivalent — web-only)"
        >
          <p className="mb-4 font-sans text-xs text-text-muted">
            We use{' '}
            <a
              className="text-primary underline"
              href="https://www.npmjs.com/package/meemaw"
              target="_blank"
              rel="noreferrer"
            >
              meemaw
            </a>{' '}
            for the readable conditional/list patterns called out in{' '}
            <code>docs/web-guide/guide.md</code>.
          </p>

          <div className="space-y-6">
            <div>
              <p className="mb-2 font-mono text-xs text-text-muted">
                {'<Show when={...}> + <Hidden on="mobile|tablet|desktop">'}
              </p>
              <Show when fallback={<span className="text-text-muted">hidden</span>}>
                <AppTag
                  label="Show — currently visible"
                  variant="solid"
                  color="var(--ohl-success)"
                />
              </Show>
              <span className="ml-2" />
              <Hidden on="mobile">
                <AppTag label="Hidden on mobile (visible ≥768px)" variant="outline" />
              </Hidden>
              <span className="ml-2" />
              <Hidden on="desktop">
                <AppTag label="Hidden on desktop (visible <1024px)" variant="outline" />
              </Hidden>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs text-text-muted">
                {'<Switch>/<Case>/<Default>'}
              </p>
              <Switch>
                <Case when={otp.length === 0}>
                  <AppText color="var(--ohl-text-muted)">
                    Type a digit in the OTP input above…
                  </AppText>
                </Case>
                <Case when={otp.length === 6}>
                  <AppText color="var(--ohl-success)">All 6 digits entered ({otp})</AppText>
                </Case>
                <Default>
                  <AppText>Partial entry: {otp.length} of 6</AppText>
                </Default>
              </Switch>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs text-text-muted">{'<Repeat times={n}>'}</p>
              <div className="flex gap-2">
                <Repeat times={5}>
                  {(_, i) => (
                    <span
                      key={i}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-sans text-xs font-semibold text-primary"
                    >
                      {i + 1}
                    </span>
                  )}
                </Repeat>
              </div>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs text-text-muted">
                {'<Loadable loading | error>'}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border p-4">
                  <Loadable loading loadingComponent={<AppLoader size={20} />}>
                    Hidden
                  </Loadable>
                </div>
                <div className="rounded-md border border-border p-4">
                  <Loadable
                    error="Failed to fetch"
                    errorComponent={<AppErrorState message="Failed to fetch" />}
                  >
                    Hidden
                  </Loadable>
                </div>
                <div className="rounded-md border border-border p-4">
                  <Loadable>
                    <AppText>Loaded content</AppText>
                  </Loadable>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs text-text-muted">{'<CopyToClipboard>'}</p>
              <CopyToClipboard text="https://ohlify.com/jocelyn-aminoff">
                {(copy, copied) => (
                  <AppButton
                    label={copied ? 'Copied!' : 'Copy share link'}
                    variant="plain"
                    onPressed={copy}
                  />
                )}
              </CopyToClipboard>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs text-text-muted">
                {'<Clamp maxLines={2} expandable>'}
              </p>
              <Clamp maxLines={2} expandable expandText="Read more" collapseText="Read less">
                Horem ipsum dolor sit amet, consectetur adipiscing elit. Etiam eu turpis molestie,
                dictum est a, mattis tellus. Sed dignissim, metus nec fringilla accumsan, risus sem
                lacus, ut interdum tellus elit sed risus. Maecenas condimentum velit, sit amet
                feugiat lectus. Class aptent taciti sociosqu ad litora torquent per conubia nostra.
              </Clamp>
            </div>
          </div>
        </Section>

        <Section title="KycItemTile" mobileFile="kyc_item_tile/kyc_item_tile.dart">
          <div className="flex flex-col gap-3">
            <KycItemTile
              Icon={IconMail}
              title="Add your email"
              subtitle="We will send a verification code."
              completed={false}
              onTap={() => undefined}
            />
            <KycItemTile
              Icon={IconPhone}
              title="Verify phone number"
              subtitle="0801 234 6789"
              completed
              onTap={() => undefined}
            />
          </div>
        </Section>
      </div>
    </main>
  );
}
