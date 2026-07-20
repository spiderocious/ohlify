import { AppText, colors, showToast } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import { notificationPrefsApi } from '@features/me/api/notification-prefs-api';
import type { NotificationPreferences } from '@features/me/types/me-models';
import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold';

const DEFAULT_PREFS: NotificationPreferences = { sms: false, email: false, push: false };

/** Mirrors mobile/lib/features/profile/screen/notification_preferences_screen.dart. */
export function NotificationPreferencesScreen() {
  const [prefs, setPrefs] = useState<NotificationPreferences | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    notificationPrefsApi
      .get()
      .then((p) => {
        if (!cancelled) setPrefs(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e : ApiError.network);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(patch: Partial<NotificationPreferences>) {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await notificationPrefsApi.update(patch);
      setPrefs(updated);
    } catch (e) {
      showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  let body;
  if (loading) {
    body = (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (error) {
    body = (
      <View style={{ paddingVertical: 32 }}>
        <AppText variant="body" color={colors.textMuted} align="center">
          {apiErrorMessage(error)}
        </AppText>
      </View>
    );
  } else {
    const p = prefs ?? DEFAULT_PREFS;
    body = (
      <View>
        <ToggleRow
          title="SMS Notifications"
          subtitle="Receive alerts and updates via SMS"
          value={p.sms}
          onChange={(v) => toggle({ sms: v })}
        />
        <View style={{ height: 24, borderTopWidth: 1, borderTopColor: colors.border, marginVertical: 24 }} />
        <ToggleRow
          title="Email Notifications"
          subtitle="Receive alerts and updates via email"
          value={p.email}
          onChange={(v) => toggle({ email: v })}
        />
        <View style={{ height: 24, borderTopWidth: 1, borderTopColor: colors.border, marginVertical: 24 }} />
        <ToggleRow
          title="Push Notifications"
          subtitle="Receive in-app push notifications"
          value={p.push}
          onChange={(v) => toggle({ push: v })}
        />
      </View>
    );
  }

  return <ProfileSubscreenScaffold title="Notifications" body={body} />;
}

function ToggleRow({ title, subtitle, value, onChange }: { title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <AppText variant="medium" color={colors.textJet} weight="700" align="left">
          {title}
        </AppText>
        <View style={{ height: 4 }} />
        <AppText variant="body" color={colors.textMuted} align="left">
          {subtitle}
        </AppText>
      </View>
      <View style={{ width: 12 }} />
      <Switch value={value} onValueChange={onChange} thumbColor="#FFFFFF" trackColor={{ true: colors.success, false: colors.border }} />
    </View>
  );
}
