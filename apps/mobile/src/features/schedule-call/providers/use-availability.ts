import { useCallback, useRef, useState } from 'react';

import { ApiError } from '@shared/types/api-error';

import { professionalsApi } from '@features/professionals/api/professionals-api';
import type { AvailabilitySlot } from '@features/professionals/types/professional-models';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Owns the /professionals/:id/availability round-trip for the schedule
 * screen. Refetches whenever (date, callType, durationMinutes) changes.
 * Mirrors mobile/lib/features/schedule_call/providers/availability_notifier.dart.
 */
export function useAvailability(professionalId: string) {
  const [date, setDateState] = useState<Date | undefined>(undefined);
  const [callType, setCallTypeState] = useState<string | undefined>(undefined);
  const [durationMinutes, setDurationMinutesState] = useState<number | undefined>(undefined);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const seqRef = useRef(0);

  const hasAllParams = date !== undefined && callType !== undefined && durationMinutes !== undefined;

  const refetch = useCallback(async (d: Date, ct: string, dur: number) => {
    const seq = ++seqRef.current;
    setIsFetching(true);
    setError(undefined);
    try {
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const res = await professionalsApi.getAvailability(professionalId, { from, to, callType: ct, durationMinutes: dur });
      if (seq !== seqRef.current) return;
      const day = res.days[0];
      setSlots(day ? day.slots.filter((s) => s.available) : []);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(e instanceof ApiError ? e : ApiError.network);
    } finally {
      if (seq === seqRef.current) setIsFetching(false);
    }
  }, [professionalId]);

  const update = useCallback(
    (params: { date: Date | undefined; callType: string | undefined; durationMinutes: number | undefined }) => {
      const dateChanged = (params.date === undefined) !== (date === undefined) || (params.date && date && !isSameDay(params.date, date));
      if (!dateChanged && params.callType === callType && params.durationMinutes === durationMinutes) return;

      setDateState(params.date);
      setCallTypeState(params.callType);
      setDurationMinutesState(params.durationMinutes);

      if (params.date !== undefined && params.callType !== undefined && params.durationMinutes !== undefined) {
        refetch(params.date, params.callType, params.durationMinutes);
      } else {
        setSlots([]);
        setError(undefined);
      }
    },
    [date, callType, durationMinutes, refetch],
  );

  const isLoading = isFetching && hasAllParams;

  return { availableSlots: slots, isFetching, isLoading, error, hasAllParams, update };
}
