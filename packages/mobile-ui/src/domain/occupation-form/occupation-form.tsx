import { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '../../primitives/app-button/app-button';
import {
  AppDropdownInput,
  type DropdownOption,
} from '../../primitives/app-dropdown-input/app-dropdown-input';
import { AppText } from '../../primitives/app-text/app-text';
import { AppTextInput } from '../../primitives/app-text-input/app-text-input';
import { colors } from '../../theme/colors';

/**
 * Reusable occupation picker — dropdown of curated options with an "Other"
 * free-text fallback. 1:1 with
 * mobile/lib/ui/widgets/occupation_form/occupation_form.dart.
 */
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

export interface OccupationFormProps {
  initialValue?: string;
  onSave: (value: string) => void;
  description?: string;
  submitLabel?: string;
}

function initialSelection(initialValue?: string): { selected?: string; other: string } {
  if (!initialValue) return { selected: undefined, other: '' };
  const match = OPTIONS.find((o) => o.value !== OTHER_VALUE && o.value === initialValue);
  if (match) return { selected: match.value, other: '' };
  return { selected: OTHER_VALUE, other: initialValue };
}

export function OccupationForm({
  initialValue,
  onSave,
  description = 'Let your community and the public know what you do, so you are easy to find.',
  submitLabel = 'Save',
}: OccupationFormProps) {
  const init = initialSelection(initialValue);
  const [selectedOption, setSelectedOption] = useState<string | undefined>(init.selected);
  const [otherText, setOtherText] = useState(init.other);

  const isOther = selectedOption === OTHER_VALUE;
  const resolvedValue = (() => {
    if (!selectedOption) return undefined;
    if (isOther) {
      const trimmed = otherText.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    }
    return selectedOption;
  })();

  return (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        {description}
      </AppText>
      <View style={{ height: 16 }} />
      <AppDropdownInput
        label="Occupation"
        options={OPTIONS}
        value={selectedOption}
        placeholder="Select"
        bordered
        searchable
        onChange={setSelectedOption}
      />
      {isOther ? (
        <>
          <View style={{ height: 14 }} />
          <AppTextInput
            label="Tell us what you do"
            value={otherText}
            placeholder="e.g. Voice over artist"
            onChangeText={setOtherText}
          />
        </>
      ) : null}
      <View style={{ height: 20 }} />
      <AppButton
        label={submitLabel}
        expanded
        radius={100}
        isDisabled={resolvedValue === undefined}
        onPress={resolvedValue !== undefined ? () => onSave(resolvedValue) : undefined}
      />
    </View>
  );
}
