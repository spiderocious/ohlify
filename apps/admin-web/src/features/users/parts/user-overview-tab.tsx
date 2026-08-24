import {
  HawkAdminPanel,
  HawkBadge,
  HawkBarChart,
  HawkCallout,
  HawkCaption,
  HawkChip,
  HawkEmptyState,
  HawkKeyValue,
  HawkKpiStrip,
  HawkSemantic,
  HawkStatusBadge,
  HawkStepperVertical,
  HawkText,
  IconAlertTriangle,
  IconEscrow,
  IconPhone,
  IconStar,
  IconWallet,
  cn,
  quartet,
  type HawkKpi,
} from '@ohlify/hawk-ui';
import type { AdminUserDetail } from '@ohlify/api';

import { buildActivity, buildLifecycle } from './user-adapters.js';
import { absoluteTime, relativeTime, statusFor } from './user-status.js';

/**
 * The overview tab — everything an operator needs before deciding what to do.
 *
 * Ordered by the question it answers: *is this account in trouble* (the
 * banners), *what is it worth* (the vitals), *who is it* (identity), *how did
 * it get here* (the lifecycle).
 */
export function UserOverviewTab({ user }: { user: AdminUserDetail }) {
  const vitals = user.vitals;
  const prefs = user.notification_prefs;
  const lifecycle = buildLifecycle(user);
  const activity = buildActivity(user);

  // Money vitals come back null for roles that may not see them. Those cells
  // are dropped rather than dashed: a row of "—" invites the reader to wonder
  // whether the platform earned nothing.
  const canSeeMoney = vitals.wallet_kobo !== null;

  const kpis: HawkKpi[] = [
    ...(canSeeMoney
      ? ([
          {
            key: 'wallet',
            label: 'Wallet balance',
            valueKobo: vitals.wallet_kobo ?? 0,
            icon: IconWallet,
            semantic: 'success',
          },
          {
            key: 'lifetime',
            label: 'Lifetime earned',
            valueKobo: vitals.lifetime_earned_kobo ?? 0,
            icon: IconStar,
            basis: 'gross',
          },
          {
            key: 'escrow',
            label: 'Held in escrow',
            valueKobo: vitals.escrow_kobo ?? 0,
            icon: IconEscrow,
            // Escrow is money clients have committed but this professional has
            // not yet earned — a liability against them, not an asset.
            semantic: 'caution',
          },
        ] satisfies HawkKpi[])
      : []),
    {
      key: 'calls',
      label: 'Calls taken',
      value: vitals.calls_total.toLocaleString(),
      icon: IconPhone,
    },
    {
      key: 'rating',
      label: 'Rating',
      value: vitals.rating === null ? '—' : vitals.rating.toFixed(1),
      icon: IconStar,
      ...(vitals.review_count > 0 ? {} : { semantic: 'neutral' as const }),
    },
  ];

  return (
    <div className="flex flex-col gap-hawk-6">
      <AccountBanners user={user} />

      <HawkKpiStrip items={kpis} />

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Identity" className="lg:col-span-2">
          <IdentityGrid user={user} />
        </HawkAdminPanel>

        <HawkAdminPanel title="Reachability">
          <div className="flex flex-col gap-hawk-4">
            {/*
              Why this panel exists: "the user says they never got the
              notification" is one of the most common support tickets, and the
              answer is nearly always one of these three switches being off.
            */}
            <HawkKeyValue label="Push" value={<ToggleState on={prefs.push_enabled} />} />
            <HawkKeyValue label="Email" value={<ToggleState on={prefs.email_enabled} />} />
            <HawkKeyValue label="SMS" value={<ToggleState on={prefs.sms_enabled} />} />
            <HawkKeyValue
              label="Push devices"
              value={user.devices.length}
              record
            />
            {!prefs.push_enabled && (
              <HawkCallout
                semantic={HawkSemantic.CAUTION}
                message="Push is off, so call invites and chat alerts will not reach this device."
              />
            )}
            {prefs.push_enabled && user.devices.length === 0 && (
              <HawkCallout
                semantic={HawkSemantic.CAUTION}
                message="Push is on but no device is registered, so a notification would silently go nowhere."
              />
            )}
          </div>
        </HawkAdminPanel>
      </div>

      <div className="grid gap-hawk-6 lg:grid-cols-3">
        <HawkAdminPanel title="Account lifecycle" className="lg:col-span-2">
          <div className="flex flex-col gap-hawk-5">
            {/*
              A stepper rather than a list of dates, because the GAPS are the
              finding — three weeks between KYC submitted and reviewed is a
              queue problem, and a table of timestamps hides it.
            */}
            <HawkStepperVertical steps={lifecycle} current={lifecycle.length} />
            <HawkCaption ink="muted" className="leading-snug">
              Every stage is a timestamp column on the user record. The interval between two
              steps is usually more interesting than either date.
            </HawkCaption>
          </div>
        </HawkAdminPanel>

        <HawkAdminPanel title="Call activity">
          <div className="flex flex-col gap-hawk-4">
            {activity.length === 0 ? (
              <HawkEmptyState
                title="No calls yet"
                description="This account has never been on a call."
              />
            ) : (
              <HawkBarChart data={activity} height={150} semantic={HawkSemantic.INFO} />
            )}
            <div className="flex flex-col gap-hawk-3">
              <HawkKeyValue label="Completed" value={vitals.calls_completed} record />
              <HawkKeyValue label="Missed" value={vitals.calls_missed} record />
              <HawkKeyValue
                label="Rating"
                value={
                  // Null is "never rated", not "rated zero".
                  vitals.rating === null
                    ? '—'
                    : `${vitals.rating.toFixed(1)} (${vitals.review_count})`
                }
                record
              />
            </div>
          </div>
        </HawkAdminPanel>
      </div>
    </div>
  );
}

/**
 * Account-state banners.
 *
 * Only rendered when something is actually wrong. A permanent row of green
 * "account is fine" boxes is a row people stop reading, which is exactly when
 * you need them to notice the one that turned red.
 */
function AccountBanners({ user }: { user: AdminUserDetail }) {
  const banners: Array<{ key: string; semantic: HawkSemantic; title: string; message: string }> =
    [];

  if (user.status === 'suspended') {
    banners.push({
      key: 'suspended',
      semantic: HawkSemantic.CAUTION,
      title: 'Account suspended',
      message: user.suspended_until
        ? `Cannot sign in until ${absoluteTime(user.suspended_until)}.`
        : 'Cannot sign in until an operator lifts the suspension.',
    });
  }
  if (user.status === 'blocked') {
    banners.push({
      key: 'blocked',
      semantic: HawkSemantic.CRITICAL,
      title: 'Account blocked',
      message: 'Blocked for fraud or a terms violation. Harsher than suspension.',
    });
  }
  if (user.vitals.active_strikes > 0) {
    banners.push({
      key: 'strikes',
      semantic: HawkSemantic.CRITICAL,
      title: `${user.vitals.active_strikes} active ${
        user.vitals.active_strikes === 1 ? 'strike' : 'strikes'
      }`,
      message: 'Standing is affected. See the Trust tab for what was issued and why.',
    });
  }
  if (!user.email_verified_at) {
    banners.push({
      key: 'email',
      semantic: HawkSemantic.CAUTION,
      title: 'Email never verified',
      message: 'Anything sent to this address may never have been read.',
    });
  }
  // A handle changed in the last week, on an account under review, is a
  // pattern worth seeing — it is how someone outruns a bad reputation.
  if (
    user.profile.handle_changed_at &&
    Date.now() - new Date(user.profile.handle_changed_at).getTime() < 7 * 86_400_000
  ) {
    banners.push({
      key: 'handle',
      semantic: HawkSemantic.INFO,
      title: 'Handle changed recently',
      message: `Renamed ${relativeTime(user.profile.handle_changed_at)}. The old handle still redirects.`,
    });
  }

  if (banners.length === 0) return null;

  return (
    <div className="flex flex-col gap-hawk-3">
      {banners.map((banner) => (
        <HawkCallout
          key={banner.key}
          semantic={banner.semantic}
          title={banner.title}
          message={banner.message}
          icon={IconAlertTriangle}
        />
      ))}
    </div>
  );
}

function IdentityGrid({ user }: { user: AdminUserDetail }) {
  const { interests, categories } = user.profile;

  return (
    <div className="flex flex-col gap-hawk-5">
      <div className="grid gap-x-hawk-6 gap-y-hawk-4 sm:grid-cols-2">
        <HawkKeyValue label="User ID" value={user.id} record />
        <HawkKeyValue label="Handle" value={user.handle ? `@${user.handle}` : '—'} record />
        <HawkKeyValue
          label="Role"
          value={
            <HawkBadge
              label={user.role === 'professional' ? 'Professional' : 'Client'}
              semantic={user.role === 'professional' ? HawkSemantic.INFO : HawkSemantic.NEUTRAL}
              size="sm"
            />
          }
        />
        <HawkKeyValue
          label="Status"
          value={<HawkStatusBadge status={statusFor('user', user.status)} size="sm" />}
        />
        <HawkKeyValue
          label="Email"
          value={
            <span className="flex flex-wrap items-center gap-hawk-3">
              <span className="hawk-record">{user.email}</span>
              <VerificationChip at={user.email_verified_at} />
            </span>
          }
        />
        <HawkKeyValue
          label="Phone"
          value={
            <span className="flex flex-wrap items-center gap-hawk-3">
              <span className="hawk-record">{user.phone_number ?? '—'}</span>
              <VerificationChip at={user.phone_verified_at} />
            </span>
          }
        />
        <HawkKeyValue label="Joined" value={absoluteTime(user.created_at)} record />
        <HawkKeyValue
          label="Last seen"
          value={`${relativeTime(user.last_seen_at)} · ${absoluteTime(user.last_seen_at)}`}
          record
        />
        <HawkKeyValue
          label="Available"
          value={
            <ToggleState
              on={user.profile.is_available}
              onLabel="Accepting calls"
              offLabel="Away"
            />
          }
        />
        <HawkKeyValue label="Occupation" value={user.occupation ?? '—'} />
      </div>

      {user.description && (
        <div className="flex flex-col gap-hawk-2">
          <HawkCaption ink="muted">Bio</HawkCaption>
          <HawkText variant="caption" className="leading-relaxed">
            {user.description}
          </HawkText>
        </div>
      )}

      {(interests.length > 0 || categories.length > 0) && (
        <div className="flex flex-col gap-hawk-3">
          <HawkCaption ink="muted">Interests &amp; categories</HawkCaption>
          <div className="flex flex-wrap gap-hawk-2">
            {categories.map((category) => (
              <HawkChip key={`c-${category}`} label={category} />
            ))}
            {interests.map((interest) => (
              <HawkChip key={`i-${interest}`} label={interest} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Verified-when, or an explicit "never" — an absent mark is ambiguous. */
function VerificationChip({ at }: { at: string | null }) {
  const tone = quartet(at ? HawkSemantic.SUCCESS : HawkSemantic.CAUTION);
  return (
    <HawkCaption className={tone.text}>
      {at ? `verified ${relativeTime(at)}` : 'never verified'}
    </HawkCaption>
  );
}

function ToggleState({
  on,
  onLabel = 'On',
  offLabel = 'Off',
}: {
  on: boolean;
  onLabel?: string;
  offLabel?: string;
}) {
  const tone = quartet(on ? HawkSemantic.SUCCESS : HawkSemantic.NEUTRAL);
  return (
    <HawkText
      variant="caption"
      className={cn('font-medium', on ? tone.text : 'text-hawk-ink-muted')}
    >
      {on ? onLabel : offLabel}
    </HawkText>
  );
}
