import { AppButton, AppText, AppTextInput, colors, showCustomModal } from '@ohlify/mobile-ui';
import { useState } from 'react';
import { View } from 'react-native';

export interface InviteSheetProps {
  onSubmit: (handle: string) => Promise<string | null>;
}

/**
 * Adds a third person to a call, by handle.
 *
 * Handle rather than a contact picker or a user id: it is the only public
 * identifier, and an id-based invite box would let anyone enumerate accounts.
 *
 * The copy is explicit that the professional decides and that the inviter pays,
 * because both are surprising otherwise — someone who invites a friend should
 * not discover afterwards that it came out of their balance.
 */
export function showInviteSheet(props: InviteSheetProps) {
  showCustomModal('Add someone', (dismiss) => (
    <InviteSheetBody {...props} onDone={dismiss} />
  ));
}

function InviteSheetBody({ onSubmit, onDone }: InviteSheetProps & { onDone: () => void }) {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const trimmed = handle.trim().replace(/^@/, '');
    if (trimmed.length === 0) {
      setError('Enter a handle');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const failure = await onSubmit(trimmed);
    setIsSubmitting(false);
    if (failure === null) onDone();
    else setError(failure);
  };

  return (
    <View>
      <AppTextInput
        label="Handle"
        placeholder="@handle"
        value={handle}
        onChangeText={(v) => {
          setHandle(v);
          setError(null);
        }}
        errorMessage={error ?? undefined}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      <View style={{ height: 8 }} />
      <AppText variant="bodySmall" color={colors.textMuted} align="left">
        They join on your minutes, and the professional has to allow them in
        first.
      </AppText>
      <View style={{ height: 16 }} />
      <AppButton
        label="Send invite"
        radius={100}
        height={50}
        expanded
        isLoading={isSubmitting}
        onPress={() => void submit()}
      />
    </View>
  );
}
