import { AppText, cn } from '@ohlify/ui';

import { useNotificationPreferences, useUpdateNotificationPreferences } from '../api/use-notification-preferences.js';

import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold.js';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
}

function PrefRow({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-background p-4">
      <div className="min-w-0 flex-1">
        <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
          {label}
        </AppText>
        <AppText
          variant="bodyNormal"
          align="start"
          color="var(--ohl-text-muted)"
          className="mt-0.5"
        >
          {description}
        </AppText>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        aria-label={label}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-dark',
        )}
      >
        <span
          className={cn(
            'absolute h-5 w-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

/** Mirrors mobile/lib/features/profile/screen/notification_preferences_screen.dart. */
export function NotificationPreferencesScreen() {
  const { data: prefs } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  return (
    <ProfileSubscreenScaffold title="Notifications">
      <div className="space-y-3">
        <PrefRow
          checked={prefs?.sms.enabled ?? false}
          onChange={(v) => update.mutate({ sms: v })}
          label="SMS notifications"
          description="Get text messages for upcoming calls and account events."
        />
        <PrefRow
          checked={prefs?.email.enabled ?? false}
          onChange={(v) => update.mutate({ email: v })}
          label="Email notifications"
          description="Receive a summary email when calls are scheduled or completed."
        />
      </div>
    </ProfileSubscreenScaffold>
  );
}
