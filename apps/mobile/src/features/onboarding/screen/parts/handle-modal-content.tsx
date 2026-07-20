import { AppButton, AppIcon, AppTextInput, colors } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { onboardingApi } from '@features/onboarding/api/onboarding-api';
import { kycTextValue, type KycItemSpec } from '@features/onboarding/types/kyc-spec';
import { ApiError } from '@shared/types/api-error';

/**
 * Custom modal for the `handle` KYC item. Adds debounced live availability
 * checking on top of the standard input modal. Mirrors
 * mobile/lib/features/onboarding/screen/parts/handle_modal_content.dart.
 */
type CheckStatus = 'idle' | 'tooShort' | 'formatLocal' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalidFormat' | 'error';

const DEBOUNCE_MS = 350;
const DEFAULT_HANDLE_REGEX = /^[a-z0-9_]{3,24}$/;
const LOCAL_FORMAT_MESSAGE = '3–24 chars, lowercase letters, digits, or underscore.';

function isErrorStatus(status: CheckStatus): boolean {
  return status === 'tooShort' || status === 'formatLocal' || status === 'taken' || status === 'reserved' || status === 'invalidFormat' || status === 'error';
}

export interface HandleModalContentProps {
  item: KycItemSpec;
  onSubmit: (handle: string) => Promise<void>;
}

export function HandleModalContent({ item, onSubmit }: HandleModalContentProps) {
  const initial = kycTextValue(item) ?? '';
  // Memoized: otherwise a fresh RegExp identity on every render changes
  // passesLocalFormat's identity below, which re-triggers the mount effect's
  // cleanup on every keystroke's re-render and cancels the debounced check
  // before it ever fires.
  const localRegex = useMemo(() => {
    const rule = item.validation.find((r) => r.rule === 'regex');
    if (rule && rule.rule === 'regex') {
      try {
        return new RegExp(rule.value);
      } catch {
        return DEFAULT_HANDLE_REGEX;
      }
    }
    return DEFAULT_HANDLE_REGEX;
  }, [item.validation]);

  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const checkSeqRef = useRef(0);

  const passesLocalFormat = useCallback((v: string) => localRegex.test(v), [localRegex]);

  const runCheck = useCallback(
    async (v: string) => {
      const seq = ++checkSeqRef.current;
      try {
        const result = await onboardingApi.checkHandle(v);
        if (seq !== checkSeqRef.current) return;
        if (result.available) {
          setStatus('available');
          setStatusMessage('Available');
          setSuggestions([]);
          return;
        }
        switch (result.reason) {
          case 'taken':
            setStatus('taken');
            setStatusMessage('That username is taken.');
            setSuggestions(result.suggestions);
            return;
          case 'reserved':
            setStatus('reserved');
            setStatusMessage('That username is reserved. Please pick another.');
            return;
          case 'invalid_format':
            setStatus('invalidFormat');
            setStatusMessage(LOCAL_FORMAT_MESSAGE);
            return;
          default:
            setStatus('error');
            setStatusMessage("That username isn't available.");
        }
      } catch (error) {
        if (seq !== checkSeqRef.current) return;
        if (error instanceof ApiError) {
          if (error.reason === 'rate_limited') {
            setStatus('error');
            setStatusMessage('Slow down a moment, then try again.');
            return;
          }
          setStatus('error');
          setStatusMessage(error.message);
          return;
        }
        throw error;
      }
    },
    [],
  );

  const scheduleCheck = useCallback(
    (v: string, immediate = false) => {
      clearTimeout(debounceRef.current);
      setStatus('checking');
      debounceRef.current = setTimeout(() => void runCheck(v), immediate ? 0 : DEBOUNCE_MS);
    },
    [runCheck],
  );

  // Mirrors the Dart source's initState check: if we have an initial value
  // (editing an existing handle) matching local format, kick off a check
  // immediately. `initial` is derived from props once and never changes for
  // the lifetime of this modal, so this intentionally behaves as mount-only
  // despite listing its real dependencies.
  useEffect(() => {
    if (passesLocalFormat(initial)) {
      scheduleCheck(initial, true);
    } else if (initial.length > 0) {
      setStatus('formatLocal');
      setStatusMessage(LOCAL_FORMAT_MESSAGE);
    }
    return () => clearTimeout(debounceRef.current);
  }, [initial, passesLocalFormat, scheduleCheck]);

  function onChangeText(raw: string) {
    const v = raw.toLowerCase();
    setValue(v);
    setSuggestions([]);

    if (v.length === 0) {
      clearTimeout(debounceRef.current);
      setStatus('idle');
      return;
    }
    if (v.length < 3) {
      clearTimeout(debounceRef.current);
      setStatus('tooShort');
      setStatusMessage('Keep typing — at least 3 characters.');
      return;
    }
    if (!passesLocalFormat(v)) {
      clearTimeout(debounceRef.current);
      setStatus('formatLocal');
      setStatusMessage(LOCAL_FORMAT_MESSAGE);
      return;
    }
    if (v === initial) {
      clearTimeout(debounceRef.current);
      setStatus('available');
      setStatusMessage('Available — this is your current username.');
      return;
    }
    scheduleCheck(v);
  }

  const canSubmit = !saving && status === 'available' && value.length > 0;

  async function save() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSubmit(value);
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.reason) {
          case 'handle_taken':
            setStatus('taken');
            setStatusMessage('That username was just taken. Try another.');
            break;
          case 'handle_reserved':
            setStatus('reserved');
            setStatusMessage('That username is reserved. Please pick another.');
            break;
          case 'handle_invalid_format':
            setStatus('invalidFormat');
            setStatusMessage(LOCAL_FORMAT_MESSAGE);
            break;
          default:
            setStatus('error');
            setStatusMessage(error.message);
        }
      } else {
        throw error;
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 14, color: colors.textMuted }}>{item.subtitle}</Text>
      <View style={{ height: 16 }} />
      <AppTextInput
        label="Username"
        value={value}
        placeholder="e.g. ada_lovelace"
        maxLength={24}
        onChangeText={onChangeText}
        startIcon={<Text style={{ fontFamily: 'MonaSans-SemiBold', fontWeight: '600', color: colors.textMuted }}>@</Text>}
        endIcon={<StatusIcon status={status} />}
        errorMessage={isErrorStatus(status) ? statusMessage : undefined}
      />
      {status === 'available' && statusMessage ? (
        <Text style={{ fontFamily: 'MonaSans-Medium', fontSize: 12, color: colors.success, fontWeight: '500', marginTop: 6 }}>
          {statusMessage}
        </Text>
      ) : null}
      {status === 'checking' ? (
        <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: 12, color: colors.textSlate, marginTop: 6 }}>
          Checking availability…
        </Text>
      ) : null}
      {suggestions.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: 'MonaSans-Medium', fontSize: 12, color: colors.textSlate }}>Try one of these:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => onChangeText(s)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 100,
                  backgroundColor: colors.surfaceLight,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontFamily: 'MonaSans-Medium', fontSize: 13, color: colors.textJet, fontWeight: '500' }}>@{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <View style={{ height: 20 }} />
      <AppButton label={saving ? 'Saving…' : 'Save'} expanded radius={100} isDisabled={!canSubmit} onPress={canSubmit ? save : undefined} />
    </View>
  );
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'checking') return <ActivityIndicator size="small" />;
  if (status === 'available') return <AppIcon name="checkCircle" size={18} color={colors.success} />;
  if (status === 'taken' || status === 'reserved' || status === 'invalidFormat' || status === 'error') {
    return <AppIcon name="error" size={18} color={colors.error} />;
  }
  return null;
}
