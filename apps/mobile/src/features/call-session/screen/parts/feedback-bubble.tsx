import { AppButton, AppText, colors } from '@ohlify/mobile-ui';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

const EMOJI_OPTIONS = ['😖', '😒', '😐', '🙂', '😍'];

export interface EmojiFeedbackBubbleProps {
  onSubmit: (index: number) => void;
  onAddFeedback: (index: number) => void;
  onSkip: () => void;
}

/** Post-call emoji feedback bubble. Mirrors mobile/lib/features/call_session/screen/parts/feedback_bubble.dart. */
export function EmojiFeedbackBubble({ onSubmit, onAddFeedback, onSkip }: EmojiFeedbackBubbleProps) {
  const [selected, setSelected] = useState<number | undefined>(undefined);

  return (
    <View>
      <Bubble>
        <AppText variant="body" color={colors.textJet} align="left">
          Please rate your experience so far
        </AppText>
      </Bubble>
      <View style={{ height: 10 }} />
      <Bubble>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {EMOJI_OPTIONS.map((emoji, i) => (
            <EmojiOption key={emoji} emoji={emoji} selected={selected === i} onTap={() => setSelected(i)} />
          ))}
        </View>
      </Bubble>
      <View style={{ height: 16 }} />
      <AppButton label="Submit" expanded radius={100} isDisabled={selected === undefined} onPress={selected === undefined ? undefined : () => onSubmit(selected)} />
      <View style={{ height: 10 }} />
      <AppButton label="Add feedback" variant="subtle" expanded radius={100} onPress={() => onAddFeedback(selected ?? 2)} />
      <View style={{ height: 6 }} />
      <Pressable onPress={onSkip} style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 }}>
        <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Skip</Text>
      </Pressable>
    </View>
  );
}

export interface DescriptionFeedbackBubbleProps {
  onSubmit: (value: string) => void;
  onSkip: () => void;
}

/** Free-text feedback bubble shown after "Add feedback". */
export function DescriptionFeedbackBubble({ onSubmit, onSkip }: DescriptionFeedbackBubbleProps) {
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  return (
    <View>
      <Bubble>
        <AppText variant="body" color={colors.textJet} align="left">
          Add feedback
        </AppText>
      </Bubble>
      <View style={{ height: 10 }} />
      <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderRadius: 20 }}>
        <AppText variant="body" color={colors.textNavy} weight="700" align="left">
          Description*
        </AppText>
        <View style={{ height: 10 }} />
        <TextInput
          multiline
          numberOfLines={5}
          value={value}
          onChangeText={setValue}
          placeholder="Provide a detailed response"
          placeholderTextColor={colors.textSlate}
          style={{ fontFamily: 'MonaSans-Regular', fontSize: 14, color: colors.textJet, minHeight: 100, textAlignVertical: 'top' }}
        />
      </View>
      <View style={{ height: 16 }} />
      <AppButton label="Submit" expanded radius={100} isDisabled={!trimmed} onPress={!trimmed ? undefined : () => onSubmit(trimmed)} />
      <View style={{ height: 6 }} />
      <Pressable onPress={onSkip} style={{ alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 }}>
        <Text style={{ fontFamily: 'MonaSans-SemiBold', fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Skip</Text>
      </Pressable>
    </View>
  );
}

function Bubble({ children }: { children: ReactNode }) {
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderRadius: 100 }}>{children}</View>
  );
}

function EmojiOption({ emoji, selected, onTap }: { emoji: string; selected: boolean; onTap: () => void }) {
  return (
    <Pressable onPress={onTap} style={{ padding: 6, borderRadius: 999, backgroundColor: selected ? `${colors.primary}1F` : 'transparent' }}>
      <Text style={{ fontSize: 28 }}>{emoji}</Text>
    </Pressable>
  );
}
