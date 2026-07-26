import { AppIcon, AppText, colors, spring } from '@ohlify/mobile-ui';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, useWindowDimensions, View } from 'react-native';

import { formatBubbleTime } from '../../helpers/format-chat-time';
import type { OptimisticChatMessage } from '../../types/chat-models';

const TAIL = 8;
const RADIUS = 18;

/**
 * A chat message bubble, WhatsApp-style: every bubble carries an upward-
 * pointing tail on its top corner — top-left for theirs, top-right for mine —
 * drawn as a border-trick triangle whose flat top edge continues the bubble's
 * top line outward before tapering back in, so the bubble visibly points up
 * toward its sender's side. Time (plus delivery tick for mine) sits inside
 * the bubble, bottom-right. New bubbles pop in with a spring.
 */
export function MessageBubble({
  message,
  showTail,
  onRetry,
}: {
  message: OptimisticChatMessage;
  /** Last bubble of a same-sender run — only affects the gap below. */
  showTail: boolean;
  onRetry: () => void;
}) {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, ...spring.snappy }).start();
    // Mount-only — status changes must not replay the pop.
  }, []);

  const mine = message.mine;
  const isFailed = message.deliveryStatus === 'failed';
  const isSending = message.deliveryStatus === 'sending';

  const opacity = progress;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  const bubbleColor = mine ? colors.primary : colors.background;

  const bubble = (
    <View style={{ maxWidth: width * 0.76 }}>
      {/* The up-pointing tail — flush against the bubble's top corner. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          ...(mine ? { right: -TAIL } : { left: -TAIL }),
          width: 0,
          height: 0,
          borderTopWidth: TAIL,
          borderTopColor: bubbleColor,
          ...(mine
            ? { borderRightWidth: TAIL, borderRightColor: 'transparent' }
            : { borderLeftWidth: TAIL, borderLeftColor: 'transparent' }),
        }}
      />
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 8,
          paddingBottom: 6,
          backgroundColor: bubbleColor,
          borderRadius: RADIUS,
          // Square off the corner the tail attaches to so they merge.
          ...(mine ? { borderTopRightRadius: 0 } : { borderTopLeftRadius: 0 }),
          opacity: isSending ? 0.7 : 1,
          borderWidth: isFailed ? 1.5 : 0,
          borderColor: colors.danger,
          ...(mine
            ? {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
              }
            : {
                shadowColor: '#3D3A6E',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.07,
                shadowRadius: 6,
                elevation: 2,
              }),
        }}
      >
        <AppText
          variant="body"
          color={mine ? colors.textWhite : colors.textJet}
          align="left"
          style={{ fontSize: 15, lineHeight: 21 }}
        >
          {message.body}
        </AppText>
        <View style={{ height: 2 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' }}>
          <AppText variant="bodySmall" weight="500" color={mine ? 'rgba(255,255,255,0.75)' : colors.textSlate}>
            {formatBubbleTime(message.createdAt)}
          </AppText>
          {mine ? (
            <>
              <View style={{ width: 4 }} />
              <AppIcon
                name={isSending ? 'clock' : 'check'}
                size={12}
                color={isSending ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.9)'}
              />
            </>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={{
        alignItems: mine ? 'flex-end' : 'flex-start',
        // The tail hangs TAIL px outside the bubble — keep it off the screen edge.
        paddingHorizontal: TAIL,
        marginBottom: showTail ? 12 : 4,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      {isFailed ? <Pressable onPress={onRetry}>{bubble}</Pressable> : bubble}
      {isFailed ? (
        <Pressable onPress={onRetry} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
          <AppIcon name="error" size={13} color={colors.danger} />
          <View style={{ width: 4 }} />
          <AppText variant="bodySmall" weight="600" color={colors.danger}>
            Not delivered · Tap to retry
          </AppText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
