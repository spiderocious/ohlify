import { AppAvatar, AppIcon, AppText, colors } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

import { fileService } from '@shared/services/file-service';

import {
  CallParticipantStatus,
  type CallParticipant,
} from '@features/instant-calls/types/instant-call-models';

export interface ParticipantStripProps {
  participants: CallParticipant[];
  /** Only the person paying may add someone, so only they get the button. */
  canInvite: boolean;
  onInvite: () => void;
}

const WAITING_LABEL: Partial<Record<CallParticipantStatus, string>> = {
  [CallParticipantStatus.PENDING_APPROVAL]: 'Waiting for approval',
  [CallParticipantStatus.RINGING]: 'Ringing…',
};

/**
 * Who is in the room, and who is on their way.
 *
 * Pending and ringing people are shown dimmed rather than hidden — an invite
 * that seems to do nothing for thirty seconds looks broken, and the inviter
 * needs to see that the request exists while the professional decides.
 */
export function ParticipantStrip({ participants, canInvite, onInvite }: ParticipantStripProps) {
  const present = participants.filter(
    (p) =>
      p.status === CallParticipantStatus.JOINED ||
      p.status === CallParticipantStatus.PENDING_APPROVAL ||
      p.status === CallParticipantStatus.RINGING,
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {present.map((participant) => {
        const waiting = WAITING_LABEL[participant.status];
        return (
          <View key={participant.userId} style={{ alignItems: 'center', opacity: waiting ? 0.55 : 1 }}>
            <AppAvatar
              fileKey={participant.avatarKey}
              resolveUri={fileService.mintViewUri}
              name={participant.name ?? 'Guest'}
              size={40}
            />
            <View style={{ height: 4 }} />
            <AppText variant="label" color={colors.textWhite} numberOfLines={1}>
              {participant.name ?? 'Guest'}
            </AppText>
            {waiting ? (
              <AppText variant="label" color={colors.textWhite} numberOfLines={1}>
                {waiting}
              </AppText>
            ) : null}
          </View>
        );
      })}

      {canInvite ? (
        <Pressable onPress={onInvite}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.textWhite,
              }}
            >
              <AppIcon name="add" size={18} color={colors.textWhite} />
            </View>
            <View style={{ height: 4 }} />
            <AppText variant="label" color={colors.textWhite}>
              Add
            </AppText>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
