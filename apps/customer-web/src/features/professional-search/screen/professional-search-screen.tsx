import { IconBack } from '@icons';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES, type SortOption, type Professional } from '@ohlify/core';
import { AppIconButton, AppSearchBar } from '@ohlify/ui';
import type { ProfessionalListItem } from '@ohlify/api';

import { useProfessionals } from '../api/use-professionals.js';
import { SearchResultsList } from './parts/search-results-list.js';
import { SortFilter } from './parts/sort-filter.js';

const DEBOUNCE_MS = 300;

function toProfessional(p: ProfessionalListItem): Professional {
  return {
    id: p.id,
    name: p.name,
    role: p.occupation,
    rating: p.rating,
    reviewCount: p.review_count,
    avatarKey: p.avatar_url,
    basePrice: p.base_price_kobo !== null ? Math.round(p.base_price_kobo / 100) : undefined,
  };
}

/**
 * Mirrors mobile/lib/features/professional_search/screen/professional_search_screen.dart.
 * Debounced query (300ms), sort by rating|price|name asc/desc.
 * `?focus=1` from home auto-focuses the input.
 */
export function ProfessionalSearchScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoFocus = searchParams.get('focus') === '1';
  const category = searchParams.get('category') ?? undefined;

  const [rawInput, setRawInput] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>({ key: 'rating', direction: 'desc' });
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQuery(rawInput.trim()), DEBOUNCE_MS);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [rawInput]);

  const { data } = useProfessionals({
    q: query || undefined,
    category,
    sort: sort.key === 'price' ? 'price' : sort.key === 'name' ? 'name' : 'rating',
    direction: sort.direction,
  });

  const results = (data?.data ?? []).map(toProfessional);

  return (
    <main className="flex min-h-screen flex-col bg-surface-light">
      <div className="mx-auto w-full max-w-3xl px-4 pt-3 lg:max-w-5xl">
        <div className="flex items-center gap-2.5">
          <AppIconButton
            icon={<IconBack color="var(--ohl-text-jet)" size={20} />}
            variant="ghost"
            backgroundColor="var(--ohl-background)"
            size={44}
            onPressed={() => navigate(-1)}
            ariaLabel="Back"
          />
          <div className="flex-1">
            <AppSearchBar
              placeholder="Search professional"
              value={rawInput}
              onChange={setRawInput}
              autoFocus={autoFocus}
            />
          </div>
        </div>

        <div className="mt-4">
          <SortFilter value={sort} onChange={setSort} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-6 pt-4 lg:max-w-5xl">
        <SearchResultsList
          professionals={results}
          onTap={(p) => navigate(ROUTES.PROFESSIONAL.build({ id: p.id }))}
          onSchedule={(p) => navigate(ROUTES.SCHEDULE_CALL.build({ id: p.id }))}
        />
      </div>
    </main>
  );
}
