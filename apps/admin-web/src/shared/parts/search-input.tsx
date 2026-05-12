import { useEffect, useState } from 'react';

import { AppSearchBar } from '@ohlify/ui';

interface SearchInputProps {
  value: string;
  onDebouncedChange: (value: string) => void;
  placeholder?: string;
  /** Debounce in ms. Default 300. */
  delay?: number;
}

/**
 * Debounced wrapper around AppSearchBar. List screens hold the canonical
 * filter value in URL state; this component mirrors that into local
 * state, types, and only emits the change after the user pauses.
 *
 * Keeps `value` reactive too — if the parent resets filters, this clears.
 */
export function SearchInput({
  value,
  onDebouncedChange,
  placeholder = 'Search…',
  delay = 300,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onDebouncedChange(local), delay);
    return () => clearTimeout(t);
  }, [local, value, delay, onDebouncedChange]);

  return <AppSearchBar value={local} onChange={setLocal} placeholder={placeholder} />;
}
