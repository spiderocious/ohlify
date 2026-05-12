import { forwardRef, type Ref } from 'react';

import { IconSearch } from '@icons';


import { AppTextInput } from '../app-text-input/app-text-input.js';

interface AppSearchBarProps {
  placeholder?: string;
  onChange?: (value: string) => void;
  /** When readOnly, taps anywhere fire onTap instead of focusing. */
  onTap?: () => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  value?: string;
  className?: string;
}

/**
 * Mirrors mobile/lib/ui/widgets/app_search_bar/app_search_bar.dart.
 * When `readOnly` is true the field is non-editable — tapping fires onTap
 * (used on the home screen to route to the search screen).
 */
export const AppSearchBar = forwardRef(function AppSearchBar(
  props: AppSearchBarProps,
  ref: Ref<HTMLInputElement>,
) {
  const {
    placeholder = 'Search for professional',
    onChange,
    onTap,
    readOnly = false,
    autoFocus = false,
    value,
    className,
  } = props;

  if (readOnly) {
    return (
      <button
        type="button"
        onClick={onTap}
        aria-label={placeholder}
        className={className}
        // Stretch the underlying field to the available row width.
        style={{ width: '100%', textAlign: 'left' }}
      >
        <span className="pointer-events-none block">
          <AppTextInput
            value=""
            placeholder={placeholder}
            startIcon={<IconSearch size={18} color="var(--ohl-text-muted)" />}
          />
        </span>
      </button>
    );
  }

  return (
    <div className={className} style={{ width: '100%' }}>
      <AppTextInput
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        startIcon={<IconSearch size={18} color="var(--ohl-text-muted)" />}
      />
    </div>
  );
});
