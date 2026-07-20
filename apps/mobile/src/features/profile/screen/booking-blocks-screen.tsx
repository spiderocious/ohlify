import { AppButton, AppIcon, AppText, colors, showConfirmationModal, showToast } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { pickTime } from '@shared/parts/pick-time';

import { bookingBlocksApi } from '@features/me/api/booking-blocks-api';
import type { BookingBlock } from '@features/me/types/me-models';
import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold';

function formatTime(minute: number): string {
  if (minute >= 1440) return '12:00 AM';
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
}

function formatRange(b: BookingBlock): string {
  return `${formatTime(b.startMinute)} – ${formatTime(b.endMinute)}`;
}

/**
 * Pro-only screen for declaring recurring time-of-day windows the user
 * doesn't want to be booked. Saves are full-list overwrites. Mirrors
 * mobile/lib/features/profile/screen/booking_blocks_screen.dart.
 */
export function BookingBlocksScreen() {
  const [blocks, setBlocks] = useState<BookingBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await bookingBlocksApi.list();
      setBlocks(list);
    } catch {
      // Non-fatal.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function persist(next: BookingBlock[], successMessage: string) {
    setSaving(true);
    try {
      await bookingBlocksApi.replace(next);
      await load();
      showToast(successMessage, { type: 'success' });
    } catch (e) {
      showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function pickRange(initial?: BookingBlock): Promise<BookingBlock | null> {
    const startSeed = initial ? initial.startMinute : 13 * 60;
    const start = await pickTime({ seedMinute: startSeed, helpText: 'Block starts' });
    if (start === null) return null;
    const endSeed = initial ? initial.endMinute % 1440 : (start + 60) % 1440;
    const end = await pickTime({ seedMinute: endSeed, helpText: 'Block ends' });
    if (end === null) return null;
    if (end <= start) {
      showToast('End time must be after start time.', { type: 'error' });
      return null;
    }
    return { startMinute: start, endMinute: end };
  }

  async function openAdd() {
    const picked = await pickRange();
    if (!picked) return;
    await persist([...blocks, picked], 'Block added');
  }

  async function openEdit(index: number) {
    const current = blocks[index];
    if (!current) return;
    const picked = await pickRange(current);
    if (!picked) return;
    const next = [...blocks];
    next[index] = picked;
    await persist(next, 'Block updated');
  }

  async function confirmDelete(index: number) {
    let confirmed = false;
    const handle = showConfirmationModal('Delete block?', 'This window will become bookable again.', {
      kind: 'warning',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      onConfirm: () => {
        confirmed = true;
      },
    });
    await handle.onDismissed;
    if (!confirmed) return;
    const next = blocks.filter((_, i) => i !== index);
    await persist(next, 'Block removed');
  }

  const body = (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Times you don't want to be booked. Applied every day.
      </AppText>
      <View style={{ height: 16 }} />
      {loading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : blocks.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 24, backgroundColor: colors.surfaceLight, borderRadius: 20 }}>
          <AppText variant="bodyTitle" color={colors.textJet} weight="700" align="left">
            No blocks yet
          </AppText>
          <View style={{ height: 4 }} />
          <AppText variant="bodySmall" color={colors.textMuted} align="left">
            Add a block to keep that time off your booking calendar.
          </AppText>
        </View>
      ) : (
        <View style={{ backgroundColor: colors.surfaceLight, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {blocks.map((block, i) => (
            <View key={`${block.startMinute}-${block.endMinute}-${i}`}>
              {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
              <BlockRow label={formatRange(block)} onEdit={() => openEdit(i)} onDelete={() => confirmDelete(i)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const bottom = <AppButton label="Add block" variant="outline" expanded radius={100} isDisabled={saving} onPress={saving ? undefined : openAdd} />;

  return <ProfileSubscreenScaffold title="Booking blocks" body={body} bottom={bottom} />;
}

function BlockRow({ label, onEdit, onDelete }: { label: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name="clock" size={18} color={colors.primary} />
      </View>
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textJet} weight="600" align="left">
          {label}
        </AppText>
      </View>
      <Pressable onPress={onEdit} style={{ padding: 8 }}>
        <AppIcon name="edit" size={18} color={colors.textMuted} />
      </Pressable>
      <Pressable onPress={onDelete} style={{ padding: 8 }}>
        <AppIcon name="delete" size={18} color={colors.danger} />
      </Pressable>
    </View>
  );
}
