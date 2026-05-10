import { Repeat } from 'meemaw';
import { useState } from 'react';

import { AppButton, AppText, AppTextAreaInput } from '@ohlify/ui';

const EMOJIS = [
  { emoji: '😍', label: 'love' },
  { emoji: '😀', label: 'happy' },
  { emoji: '😐', label: 'neutral' },
  { emoji: '😢', label: 'sad' },
  { emoji: '😡', label: 'angry' },
] as const;

type EmojiKey = (typeof EMOJIS)[number]['label'];

interface EmojiFeedbackBubbleProps {
  onSubmit: (key: EmojiKey) => void;
  onAddFeedback: (key: EmojiKey) => void;
  onSkip: () => void;
}

/** Mirrors mobile feedback_bubble — EmojiFeedbackBubble. */
export function EmojiFeedbackBubble({ onSubmit, onAddFeedback, onSkip }: EmojiFeedbackBubbleProps) {
  const [selected, setSelected] = useState<EmojiKey | null>(null);
  return (
    <div className="rounded-2xl bg-background p-4">
      <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
        How was the call?
      </AppText>
      <div className="mt-3 flex justify-between">
        <Repeat each={EMOJIS as unknown as { emoji: string; label: EmojiKey }[]}>
          {(e) => (
            <button
              key={e.label}
              type="button"
              onClick={() => setSelected(e.label)}
              aria-label={e.label}
              aria-pressed={selected === e.label}
              className={
                selected === e.label
                  ? 'rounded-full bg-secondary p-2 transition'
                  : 'rounded-full p-2 transition hover:bg-surface-light'
              }
            >
              <span className="block text-2xl leading-none">{e.emoji}</span>
            </button>
          )}
        </Repeat>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <AppButton label="Skip" variant="outline" radius={100} onPressed={onSkip} />
        <AppButton
          label="Add feedback"
          variant="outline"
          radius={100}
          isDisabled={selected === null}
          onPressed={selected ? () => onAddFeedback(selected) : undefined}
        />
        <AppButton
          label="Submit"
          radius={100}
          isDisabled={selected === null}
          onPressed={selected ? () => onSubmit(selected) : undefined}
        />
      </div>
    </div>
  );
}

interface DescriptionFeedbackBubbleProps {
  onSubmit: (description: string) => void;
  onSkip: () => void;
}

/** Mirrors mobile feedback_bubble — DescriptionFeedbackBubble. */
export function DescriptionFeedbackBubble({ onSubmit, onSkip }: DescriptionFeedbackBubbleProps) {
  const [text, setText] = useState('');
  return (
    <div className="rounded-2xl bg-background p-4">
      <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
        Tell us more
      </AppText>
      <div className="mt-3">
        <AppTextAreaInput
          placeholder="Share more about the experience..."
          value={text}
          onChange={setText}
          maxLength={500}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <AppButton label="Skip" variant="outline" radius={100} onPressed={onSkip} />
        <AppButton
          label="Submit"
          radius={100}
          isDisabled={text.trim() === ''}
          onPressed={text.trim() === '' ? undefined : () => onSubmit(text.trim())}
        />
      </div>
    </div>
  );
}
