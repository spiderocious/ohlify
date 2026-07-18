import { Show } from 'meemaw';
import { useNavigate } from 'react-router-dom';

import { ROUTES, type Professional, type UpcomingCall } from '@ohlify/core';
import { AppSearchBar, AppLoader, AppErrorState, CategoryFilterBar } from '@ohlify/ui';
import type { Category, ProfessionalListItem } from '@ohlify/api';

import { useHome } from '../api/use-home.js';
import { PopularProfessionalsList } from './parts/popular-professionals-list.js';
import { UpcomingCallBanner } from './parts/upcoming-call-banner.js';
import { UpcomingCallsList } from './parts/upcoming-calls-list.js';

const ALL_CATEGORY: Category = { value: '', label: 'All', icon_url: null };

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
 * Mirrors mobile/lib/features/home/screen/home_screen.dart.
 * Read-only search bar (taps go to /professionals?focus=1), optional banner,
 * upcoming calls horizontal carousel, category pills, popular professionals.
 */
export function HomeScreen() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useHome();

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-surface-light">
        <AppLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-full items-center justify-center bg-surface-light">
        <AppErrorState message="Could not load home feed." />
      </div>
    );
  }

  const professionals = (data?.popular_professionals ?? []).map(toProfessional);
  const categories: Category[] = [...(data?.categories ?? []).slice(0, 5)];
  const upcomingCalls: UpcomingCall[] = [];
  const activeMeeting = data?.active_meeting;

  const onSelectCategory = (value: string) => {
    const params = new URLSearchParams();
    if (value) params.set('category', value);
    const qs = params.toString();
    navigate(`${ROUTES.PROFESSIONALS.absPath}${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="min-h-full bg-surface-light">
      <div className="mx-auto w-full max-w-3xl px-5 pb-8 pt-5 lg:max-w-5xl">
        <AppSearchBar readOnly onTap={() => navigate(`${ROUTES.PROFESSIONALS.absPath}?focus=1`)} />

        <Show when={Boolean(activeMeeting)}>
          <div className="mt-4">
            <UpcomingCallBanner
              calleeName="Active meeting"
              scheduledTime="Now"
              onJoin={() => undefined}
            />
          </div>
        </Show>

        <div className="mt-6">
          <UpcomingCallsList
            calls={upcomingCalls}
            onViewAll={() => navigate(ROUTES.CALLS.absPath)}
            onTap={(call) => navigate(ROUTES.CALL.build({ id: call.id }))}
          />
        </div>

        <div className="mt-6">
          <CategoryFilterBar
            categories={categories.map((c) => c.label)}
            selected={ALL_CATEGORY.label}
            onSelect={(label) => {
              const match = categories.find((c) => c.label === label);
              if (match) onSelectCategory(match.value);
            }}
          />
        </div>

        <div className="mt-6">
          <PopularProfessionalsList
            professionals={professionals}
            onViewAll={() => navigate(ROUTES.PROFESSIONALS.absPath)}
            onTap={(p) => navigate(ROUTES.PROFESSIONAL.build({ id: p.id }))}
            // Scheduling removed from UI (calls revamp) — route to details, where "Call" lives.
            onSchedule={(p) => navigate(ROUTES.PROFESSIONAL.build({ id: p.id }))}
          />
        </div>
      </div>
    </div>
  );
}
