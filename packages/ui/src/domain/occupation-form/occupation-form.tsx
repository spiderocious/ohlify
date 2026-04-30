import { Show } from 'meemaw';
import { useState } from 'react';

import { AppButton } from '../../primitives/app-button/app-button.js';
import {
  AppDropdownInput,
  type DropdownOption,
} from '../../primitives/app-dropdown-input/app-dropdown-input.js';
import { AppText } from '../../primitives/app-text/app-text.js';
import { AppTextInput } from '../../primitives/app-text-input/app-text-input.js';

const OTHER_VALUE = '__other__';

const OPTIONS: DropdownOption<string>[] = [
  { label: 'Lawyer', value: 'Lawyer' },
  { label: 'Podcaster', value: 'Podcaster' },
  { label: 'Architect', value: 'Architect' },
  { label: 'Finance advisor', value: 'Finance advisor' },
  { label: 'Health coach', value: 'Health coach' },
  { label: 'Career coach', value: 'Career coach' },
  { label: 'Product designer', value: 'Product designer' },
  { label: 'Software engineer', value: 'Software engineer' },
  { label: 'Marketing consultant', value: 'Marketing consultant' },
  { label: 'Fitness coach', value: 'Fitness coach' },
  { label: 'Nutritionist', value: 'Nutritionist' },
  { label: 'Therapist', value: 'Therapist' },
  { label: 'Other', value: OTHER_VALUE },
];

interface OccupationFormProps {
  initialValue?: string;
  onSave: (value: string) => void;
  description?: string;
  submitLabel?: string;
}

/** 1:1 with mobile/lib/ui/widgets/occupation_form/occupation_form.dart. */
export function OccupationForm({
  initialValue,
  onSave,
  description = 'Let your community and the public know what you do, so you are easy to find.',
  submitLabel = 'Save',
}: OccupationFormProps) {
  const [{ selected, otherText }, setState] = useState(() => {
    if (!initialValue) return { selected: undefined as string | undefined, otherText: '' };
    const match = OPTIONS.find((o) => o.value !== OTHER_VALUE && o.value === initialValue);
    if (match) return { selected: match.value, otherText: '' };
    return { selected: OTHER_VALUE, otherText: initialValue };
  });

  const isOther = selected === OTHER_VALUE;
  const resolved = isOther ? otherText.trim() || undefined : selected;
  const disabled = !resolved;

  return (
    <div className="flex flex-col gap-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        {description}
      </AppText>
      <AppDropdownInput<string>
        label="Occupation"
        options={OPTIONS}
        value={selected}
        placeholder="Select"
        bordered
        searchable
        onChange={(v) => setState((prev) => ({ ...prev, selected: v }))}
      />
      <Show when={isOther}>
        <AppTextInput
          label="Tell us what you do"
          value={otherText}
          placeholder="e.g. Voice over artist"
          onChange={(v) => setState((prev) => ({ ...prev, otherText: v }))}
        />
      </Show>
      <AppButton
        label={submitLabel}
        expanded
        radius={100}
        isDisabled={disabled}
        onPressed={disabled ? undefined : () => onSave(resolved as string)}
      />
    </div>
  );
}
