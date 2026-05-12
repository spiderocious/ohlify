import { useState } from 'react';

import { AppButton } from '../../primitives/app-button/app-button.js';
import { type DropdownOption } from '../../primitives/app-dropdown-input/app-dropdown-input.js';
import { AppMultiSelectDropdown } from '../../primitives/app-multi-select-dropdown/app-multi-select-dropdown.js';
import { AppText } from '../../primitives/app-text/app-text.js';

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

interface InterestsFormProps {
  initialInterests: ReadonlyArray<string>;
  onSave: (values: string[]) => void;
  description?: string;
  submitLabel?: string;
}

/** 1:1 with mobile/lib/ui/widgets/interests_form/interests_form.dart. */
export function InterestsForm({
  initialInterests,
  onSave,
  description = 'Choose interests that allow us recommend you to people and to recommend people for you.',
  submitLabel = 'Save',
}: InterestsFormProps) {
  const [interests, setInterests] = useState<string[]>([...initialInterests]);
  const empty = interests.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        {description}
      </AppText>
      <AppMultiSelectDropdown
        label="Interests"
        options={INTEREST_OPTIONS}
        selected={interests}
        onChange={setInterests}
        allowOther
        placeholder="Search and select interests"
        otherPlaceholder="Add a custom interest"
      />
      <AppButton
        label={submitLabel}
        expanded
        radius={100}
        isDisabled={empty}
        onPressed={empty ? undefined : () => onSave([...interests])}
      />
    </div>
  );
}
