import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { AppIcon } from '../../icons/app-icons';
import { AppButton } from '../../primitives/app-button/app-button';
import { AppMultiSelectDropdown } from '../../primitives/app-multi-select-dropdown/app-multi-select-dropdown';
import { AppTag } from '../../primitives/app-tag/app-tag';
import { AppText } from '../../primitives/app-text/app-text';
import { colors } from '../../theme/colors';
import type { DropdownOption } from '../../primitives/app-dropdown-input/app-dropdown-input';

/** 1:1 with mobile/lib/ui/widgets/interests_form/interests_form.dart. */
const INTEREST_OPTIONS: DropdownOption<string>[] = [
  { label: 'Relationship', value: 'Relationship' },
  { label: 'Technology', value: 'Technology' },
  { label: 'Entertainment', value: 'Entertainment' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Health & Wellness', value: 'Health & Wellness' },
  { label: 'Career', value: 'Career' },
  { label: 'Education', value: 'Education' },
  { label: 'Sports', value: 'Sports' },
  { label: 'Lifestyle', value: 'Lifestyle' },
  { label: 'Business', value: 'Business' },
  { label: 'Faith & Spirituality', value: 'Faith & Spirituality' },
  { label: 'Parenting', value: 'Parenting' },
];

export interface InterestsFormProps {
  initialInterests: string[];
  onSave: (interests: string[]) => void;
  description?: string;
  submitLabel?: string;
  /**
   * When true, renders as a scrollable chip picker with the save button
   * pinned to the bottom. When false, renders the compact
   * searchable-dropdown layout for center modals.
   */
  isFullscreen?: boolean;
}

function isSelected(interests: string[], value: string): boolean {
  return interests.some((v) => v.toLowerCase() === value.toLowerCase());
}

export function InterestsForm({
  initialInterests,
  onSave,
  description = 'Choose interests that allow us recommend you to people and to recommend people for you.',
  submitLabel = 'Save',
  isFullscreen = false,
}: InterestsFormProps) {
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [otherText, setOtherText] = useState('');

  function toggle(value: string) {
    setInterests((prev) =>
      isSelected(prev, value)
        ? prev.filter((v) => v.toLowerCase() !== value.toLowerCase())
        : [...prev, value],
    );
  }

  function addOther() {
    const trimmed = otherText.trim();
    if (!trimmed || isSelected(interests, trimmed)) return;
    setInterests((prev) => [...prev, trimmed]);
    setOtherText('');
  }

  const canSave = interests.length > 0;

  if (!isFullscreen) {
    return (
      <View>
        <AppText variant="body" color={colors.textMuted} align="left">
          {description}
        </AppText>
        <View style={{ height: 16 }} />
        <AppMultiSelectDropdown
          label="Interests"
          options={INTEREST_OPTIONS}
          selected={interests}
          onChange={setInterests}
          allowOther
          placeholder="Search and select interests"
          otherPlaceholder="Add a custom interest"
        />
        <View style={{ height: 20 }} />
        <AppButton
          label={submitLabel}
          expanded
          radius={100}
          isDisabled={!canSave}
          onPress={canSave ? () => onSave(interests) : undefined}
        />
      </View>
    );
  }

  const customInterests = interests.filter(
    (v) => !INTEREST_OPTIONS.some((o) => o.value.toLowerCase() === v.toLowerCase()),
  );

  return (
    <View style={{ flex: 1 }}>
      <AppText variant="body" color={colors.textMuted} align="left">
        {description}
      </AppText>
      <View style={{ height: 20 }} />
      <ScrollView style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {INTEREST_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              value={option.value}
              selected={isSelected(interests, option.value)}
              onToggle={toggle}
            />
          ))}
          {customInterests.map((custom) => (
            <Chip key={custom} label={custom} value={custom} selected onToggle={toggle} />
          ))}
        </View>
        <View style={{ height: 16 }} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            paddingHorizontal: 10,
          }}
        >
          <AppIcon name="add" size={18} color={colors.textSlate} />
          <TextInput
            value={otherText}
            onChangeText={setOtherText}
            placeholder="Add a custom interest"
            placeholderTextColor={colors.textSlate}
            onSubmitEditing={addOther}
            style={{
              flex: 1,
              paddingVertical: 10,
              marginLeft: 8,
              fontFamily: 'MonaSans-Regular',
              fontSize: 14,
            }}
          />
        </View>
      </ScrollView>
      <View style={{ height: 12 }} />
      <AppButton
        label={submitLabel}
        expanded
        radius={100}
        isDisabled={!canSave}
        onPress={canSave ? () => onSave(interests) : undefined}
      />
    </View>
  );
}

function Chip({
  label,
  value,
  selected,
  onToggle,
}: {
  label: string;
  value: string;
  selected: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <AppTag
      label={label.toUpperCase()}
      variant={selected ? 'solid' : 'outline'}
      size="large"
      endIcon={selected ? <AppIcon name="close" size={14} color={colors.textWhite} /> : undefined}
      onPress={() => onToggle(value)}
    />
  );
}
