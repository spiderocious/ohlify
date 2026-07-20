import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppIcon, AppIconButton, AppText, colors, showToast, spring } from '@ohlify/mobile-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { pickDateTime } from '@shared/parts/pick-date-time';
import { idempotencyKey } from '@shared/utils/idempotency';

import type { RootStackParamList } from '../../../app.navigation';
import type { ChatsStackParamList } from '../../../main-tabs.navigation';
import { instantCallsApi } from '@features/instant-calls/api/instant-calls-api';
import { chatApi } from '../api/chat-api';
import { CreditsBanner } from './parts/credits-banner';
import { ScheduleCard } from './parts/schedule-card';
import {
  chatMessageIsSchedule,
  withDeliveryStatus,
  type ConversationContext,
  type OptimisticChatMessage,
} from '../types/chat-models';

type ChatsNavigation = NativeStackNavigationProp<ChatsStackParamList>;
type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<ChatsStackParamList, 'ChatThread'>;

/** A conversation thread. Mirrors mobile/lib/features/chat/screen/chat_thread_screen.dart. */
export function ChatThreadScreen() {
  const navigation = useNavigation<ChatsNavigation>();
  const route = useRoute<RouteType>();
  const { conversationId } = route.params;

  const [messages, setMessages] = useState<OptimisticChatMessage[]>([]);
  const [context, setContext] = useState<ConversationContext | undefined>(undefined);
  // True only for the very first load — a background refetch (e.g. after
  // markRead or a schedule action) keeps showing whatever's already on
  // screen instead of re-blocking with a spinner every time.
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    try {
      const [msgs, ctx] = await Promise.all([chatApi.listMessages(conversationId), chatApi.context(conversationId)]);
      // API returns newest-first; reverse for chronological display.
      setMessages([...msgs].reverse().map((m) => withDeliveryStatus(m)));
      setContext(ctx);
    } catch {
      // Non-fatal — screen stays with whatever it had.
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    chatApi.markRead(conversationId).catch(() => undefined);
  }, [conversationId, load]);

  const canSend = context?.canSend ?? true;

  function toastError(msg: string) {
    showToast(msg, { type: 'error' });
  }

  /** Pushes `body` into the thread immediately as "sending", then reconciles
   * with the server response (or marks it "failed — tap to retry" on error)
   * rather than waiting for the round trip before showing anything. Chat is
   * the highest-frequency screen in the app, so this is the single change
   * that will make it feel most alive. */
  async function send(retryOf?: OptimisticChatMessage) {
    const body = retryOf?.body ?? draft.trim();
    if (!body || !canSend) return;

    const localId = retryOf?.id ?? idempotencyKey();
    const optimistic: OptimisticChatMessage = retryOf
      ? { ...retryOf, deliveryStatus: 'sending' }
      : {
          id: localId,
          conversationId,
          senderUserId: '',
          mine: true,
          body,
          createdAt: new Date().toISOString(),
          kind: 'text',
          canAccept: false,
          canDecline: false,
          canReschedule: false,
          canCancel: false,
          deliveryStatus: 'sending',
        };

    if (retryOf) {
      setMessages((prev) => prev.map((m) => (m.id === localId ? optimistic : m)));
    } else {
      setDraft('');
      setMessages((prev) => [...prev, optimistic]);
    }

    try {
      const sent = await chatApi.send(conversationId, body);
      setMessages((prev) => prev.map((m) => (m.id === localId ? withDeliveryStatus(sent) : m)));
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...optimistic, deliveryStatus: 'failed' } : m)));
      toastError(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
    }
  }

  async function call() {
    const peer = context?.peerUserId;
    if (!peer) return;
    try {
      await instantCallsApi.start({ professionalId: peer, callType: 'audio' });
      showToast('Calling…', { type: 'success' });
    } catch (e) {
      const error = e instanceof ApiError ? e : ApiError.network;
      toastError(error.reason === 'insufficient_balance' ? 'You don’t have minutes with this professional. Buy minutes to call.' : apiErrorMessage(error));
    }
  }

  async function propose() {
    const when = await pickDateTime({ helpText: 'Schedule a call' });
    if (!when) return;
    try {
      await chatApi.proposeSchedule(conversationId, when);
      await load();
    } catch (e) {
      toastError(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
    }
  }

  async function scheduleAction(messageId: string, action: string) {
    try {
      await chatApi.scheduleAction(messageId, action);
      await load();
    } catch (e) {
      toastError(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
    }
  }

  async function reschedule(messageId: string, currentAt?: string) {
    const current = currentAt ? new Date(currentAt) : undefined;
    const when = await pickDateTime({ initial: current, helpText: 'Reschedule call' });
    if (!when) return;
    try {
      await chatApi.reschedule(messageId, when);
      await load();
    } catch (e) {
      toastError(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
    }
  }

  function buyMinutes() {
    const peer = context?.peerUserId;
    if (!peer) return;
    navigation.getParent()?.getParent<RootNavigation>()?.navigate('Professional', { professionalId: peer });
  }

  const scrollRef = useRef<ScrollView | null>(null);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <AppIconButton icon={<AppIcon name="back" size={20} color={colors.textJet} />} variant="ghost" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="700" color={colors.textJet} align="center">
            {context?.peerName ?? 'Chat'}
          </AppText>
        </View>
        <AppIconButton icon={<AppIcon name="event" size={18} color={colors.primary} />} variant="ghost" onPress={propose} />
        {context?.viewerIsClient ? (
          <>
            <View style={{ width: 8 }} />
            <AppButton label="Call" radius={100} height={36} onPress={call} />
          </>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 16 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((m) =>
              chatMessageIsSchedule(m) ? (
                <ScheduleCard key={m.id} message={m} onAction={(action) => scheduleAction(m.id, action)} onReschedule={() => reschedule(m.id, m.scheduledAt)} onJoin={call} />
              ) : (
                <Bubble key={m.id} message={m} onRetry={() => send(m)} />
              ),
            )}
          </ScrollView>
        )}
      </View>

      {context ? <CreditsBanner context={context} onBuyMinutes={buyMinutes} /> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={canSend}
            placeholder={canSend ? 'Message' : 'Buy minutes to keep chatting'}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontFamily: 'MonaSans-Regular',
              fontSize: 15,
              color: colors.textJet,
            }}
          />
        </View>
        <View style={{ width: 8 }} />
        <AppButton label="Send" radius={100} height={44} isDisabled={!canSend} onPress={canSend ? () => send() : undefined} />
      </View>
    </KeyboardAvoidingView>
  );
}

/** New/incoming bubbles slide+fade in rather than popping into the list —
 * a new message is the highest-frequency motion moment in this screen. */
function Bubble({ message, onRetry }: { message: OptimisticChatMessage; onRetry: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, ...spring.snappy }).start();
    // Only animate this bubble's own mount — re-renders from a delivery
    // status change (sending → sent/failed) should not replay the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opacity = progress;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const isFailed = message.deliveryStatus === 'failed';
  const isSending = message.deliveryStatus === 'sending';

  const content = (
    <Animated.View style={{ alignItems: message.mine ? 'flex-end' : 'flex-start', opacity, transform: [{ translateY }] }}>
      <View
        style={{
          marginBottom: 4,
          paddingHorizontal: 14,
          paddingVertical: 8,
          maxWidth: '75%',
          backgroundColor: message.mine ? colors.primary : colors.surfaceLight,
          borderRadius: 16,
          opacity: isSending ? 0.6 : 1,
          borderWidth: isFailed ? 1 : 0,
          borderColor: colors.error,
        }}
      >
        <AppText variant="body" color={message.mine ? colors.textWhite : colors.textJet} align="left">
          {message.body}
        </AppText>
      </View>
      {isFailed ? (
        <AppText variant="bodySmall" color={colors.error} align="left">
          Failed to send · Tap to retry
        </AppText>
      ) : null}
      <View style={{ height: isFailed ? 4 : 8 }} />
    </Animated.View>
  );

  return isFailed ? <Pressable onPress={onRetry}>{content}</Pressable> : content;
}
