import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@shared/api/api-client';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Encoded deeplink, resolved via @ohlify/core. */
  deeplink?: string;
}

/** Screens a banner can occupy. Must match the backend's `banner_placement` enum. */
export const BannerPlacement = {
  HOME: 'home_top',
  CALLS: 'calls_top',
  CHATS: 'chats_top',
  SETTINGS: 'settings_top',
} as const;

export type BannerPlacement = (typeof BannerPlacement)[keyof typeof BannerPlacement];

function bannerFromJson(raw: unknown): Banner | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const b = raw as Record<string, unknown>;
  return {
    id: b.id as string,
    title: (b.title as string) ?? '',
    subtitle: (b.subtitle as string) ?? undefined,
    body: (b.body as string) ?? undefined,
    imageUrl: (b.image_url as string) ?? undefined,
    ctaLabel: (b.cta_label as string) ?? undefined,
    ctaUrl: (b.cta_url as string) ?? undefined,
    deeplink: (b.deeplink as string) ?? undefined,
  };
}

export const bannerQueryKey = (placement: string): string[] => ['banners', placement];

/**
 * The single banner for a screen, or none.
 *
 * The server applies targeting, the active window, and view-once fallthrough,
 * so the client asks a plain question and renders whatever comes back. Cached
 * like everything else — a banner is not worth a spinner.
 */
export function useBanner(placement: BannerPlacement) {
  return useQuery({
    queryKey: bannerQueryKey(placement),
    queryFn: () =>
      apiClient.get('banners/resolve', {
        queryParams: { placement },
        fromJson: (data) => bannerFromJson((data as Record<string, unknown>).banner),
      }) as Promise<Banner | null>,
  });
}

/** Burns a view-once banner's single showing. Called when it actually renders. */
export async function markBannerSeen(bannerId: string): Promise<void> {
  await apiClient.post(`banners/${bannerId}/seen`, {}, { fromJson: () => undefined });
}
