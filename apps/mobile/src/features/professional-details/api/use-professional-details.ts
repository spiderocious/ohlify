import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@shared/api/query-keys';

import { professionalsApi } from '@features/professionals/api/professionals-api';

/**
 * Detail, rates, and reviews as three cached queries rather than three
 * `useEffect` chains.
 *
 * Independent so a slow reviews page never holds up the header, and cached so
 * revisiting a professional renders instantly instead of flashing a spinner at
 * a screen the user has already seen.
 */
export function useProfessionalDetail(professionalId: string) {
  return useQuery({
    queryKey: queryKeys.professional(professionalId),
    queryFn: () => professionalsApi.getById(professionalId),
  });
}

export function useProfessionalRates(professionalId: string) {
  return useQuery({
    queryKey: queryKeys.professionalRates(professionalId),
    queryFn: () => professionalsApi.getRates(professionalId),
  });
}

export function useProfessionalReviews(professionalId: string) {
  return useQuery({
    queryKey: queryKeys.professionalReviews(professionalId),
    queryFn: () => professionalsApi.getReviews(professionalId).then((page) => page.items),
  });
}
