import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatSecondsAsDuration } from '@ohlify/core';
import {
  AppAvatar,
  AppIcon,
  AppText,
  colors,
  showToast,
  Skeleton,
  spring,
  useKeyboardInset,
  type AppIconName,
} from '@ohlify/mobile-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { pickDateTime } from '@shared/parts/pick-date-time';
import { idempotencyKey } from '@shared/utils/idempotency';
import { fileService } from '@shared/services/file-service';
import { setFocusedConversation } from '@shared/push/focused-conversation';

import type { RootStackParamList } from '../../../app.navigation';
import { chatApi } from '../api/chat-api';
import { formatBubbleTime, formatDayLabel } from '../helpers/format-chat-time';
import { CreditsBanner } from './parts/credits-banner';
import { CallEventBubble } from './parts/call-event-bubble';
import { MessageBubble } from './parts/message-bubble';
import { ScheduleCard } from './parts/schedule-card';
import { ThreadEmptyState } from './parts/thread-empty-state';
import {
  chatMessageIsSchedule,
  withDeliveryStatus,
  type ConversationContext,
  type OptimisticChatMessage,
} from '../types/chat-models';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'ChatThread'>;

/** Poll for new messages every 8s while the thread is open so an inbound
 * reply appears without a manual refresh. */
const POLL_INTERVAL_MS = 8_000;

const PAGE_SIZE = 30;

/**
 * A full-screen conversation thread. The layout is two white "sheets" — the
 * header (rounded-bottom) and the composer (rounded-top) — floating over a
 * lavender-washed message canvas, so the conversation reads as its own layer.
 * Messages render in an inverted list; scrolling up past the newest page
 * lazily pulls older history. Mirrors
 * mobile/lib/features/chat/screen/chat_thread_screen.dart.
 */
export function ChatThreadScreen() {
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteType>();
  const { conversationId, peerName: initialPeerName, peerAvatarUrl: initialPeerAvatar, draft: initialDraft } = route.params;

  const [messages, setMessages] = useState<OptimisticChatMessage[]>([]);
  const [context, setContext] = useState<ConversationContext | undefined>(undefined);
  const bottomInset = useKeyboardInset();

  // While this thread is on screen, its push notifications are suppressed
  // (the user is already reading it) — see push-service's chat handler.
  useEffect(() => {
    setFocusedConversation(conversationId);
    return () => setFocusedConversation(null);
  }, [conversationId]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState(initialDraft ?? '');
  // Cursor into history — null once the very first message has been loaded.
  const olderCursor = useRef<string | null>(null);
  const olderCursorReady = useRef(false);
  const loadingOlderRef = useRef(false);
  // server id → the optimistic local id it replaced. Keying list rows through
  // this keeps a sent bubble's React key stable when the server response
  // swaps ids — otherwise the bubble remounts and replays its pop-in spring
  // (the "double bounce").
  const localIdByServerId = useRef(new Map<string, string>()).current;

  // Prefer the freshly-fetched context's name once it lands, but show the
  // name passed via nav params instantly so the header is never "Chat".
  const peerName = context?.peerName ?? initialPeerName ?? 'Chat';

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        const [page, ctx] = await Promise.all([
          chatApi.listMessages(conversationId, { limit: PAGE_SIZE }),
          chatApi.context(conversationId),
        ]);
        // API returns newest-first; reverse for chronological display.
        setMessages((prev) => reconcile(prev, [...page.items].reverse().map((m) => withDeliveryStatus(m))));
        // Only the first fetch seeds the history cursor — a poll's page-one
        // cursor would rewind past history the user has already scrolled.
        if (!olderCursorReady.current) {
          olderCursor.current = page.nextCursor;
          olderCursorReady.current = true;
        }
        setContext(ctx);
      } catch {
        // Non-fatal — keep whatever's on screen (a silent poll shouldn't wipe it).
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [conversationId],
  );

  useEffect(() => {
    load();
    chatApi.markRead(conversationId).catch(() => undefined);
    const timer = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [conversationId, load]);

  /** Scrolled past the oldest loaded message — prepend the next history page. */
  async function loadOlder() {
    const cursor = olderCursor.current;
    if (!cursor || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const page = await chatApi.listMessages(conversationId, { cursor, limit: PAGE_SIZE });
      const older = [...page.items].reverse().map((m) => withDeliveryStatus(m));
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !seen.has(m.id)), ...prev];
      });
      olderCursor.current = page.nextCursor;
    } catch {
      // Non-fatal — the next scroll-to-top retries.
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }

  const canSend = context?.canSend ?? true;

  function toastError(msg: string) {
    showToast(msg, { type: 'error' });
  }

  /** Optimistic send — pushes a "sending" bubble instantly, reconciles with
   * the server, or marks it "failed, tap to retry". */
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
      localIdByServerId.set(sent.id, localId);
      setMessages((prev) => prev.map((m) => (m.id === localId ? withDeliveryStatus(sent) : m)));
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === localId ? { ...optimistic, deliveryStatus: 'failed' } : m)));
      toastError(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
    }
  }

  function call() {
    const peer = context?.peerUserId;
    if (!peer) return;
    // Navigate, don't dial: the outgoing screen owns the request. That also
    // retires the double-tap here — the header icon had no disabled state, so
    // two quick taps used to fire two POSTs.
    navigation.navigate('OutgoingCall', {
      professionalId: peer,
      professionalName: peerName,
      ...(initialPeerAvatar === undefined ? {} : { professionalAvatarUrl: initialPeerAvatar }),
      callType: 'audio',
    });
  }

  async function propose() {
    const when = await pickDateTime({ helpText: 'Schedule a call' });
    if (!when) return;
    try {
      await chatApi.proposeSchedule(conversationId, when);
      await load({ silent: true });
    } catch (e) {
      toastError(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
    }
  }

  async function scheduleAction(messageId: string, action: string) {
    try {
      await chatApi.scheduleAction(messageId, action);
      await load({ silent: true });
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
      await load({ silent: true });
    } catch (e) {
      toastError(apiErrorMessage(e instanceof ApiError ? e : ApiError.network));
    }
  }

  function buyMinutes() {
    const peer = context?.peerUserId;
    if (!peer) return;
    navigation.navigate('Professional', { professionalId: peer });
  }

  // Inverted list: newest at data[0] renders at the visual bottom, so the
  // thread opens pinned to the latest message and reaching the data "end"
  // (visual top) triggers history loading.
  const rows = buildRows(messages).reverse();
  const peerAvatarKey = initialPeerAvatar;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceDark }}>
      {/* Header — full-bleed white bar over the canvas. */}
      <View
        style={{
          backgroundColor: colors.background,
          shadowColor: '#3D3A6E',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.07,
          shadowRadius: 14,
          elevation: 5,
          zIndex: 2,
        }}
      >
        <View>
          <ThreadHeader
            name={peerName}
            avatarKey={peerAvatarKey}
            context={context}
            onBack={() => navigation.goBack()}
            onSchedule={propose}
            onCall={context?.viewerIsClient ? call : undefined}
          />
        </View>
      </View>

      {/*
        Padded by hand instead of with KeyboardAvoidingView. The previous
        `behavior={ios ? 'padding' : undefined}` made the component inert on
        Android, and `adjustResize` cannot compensate while the app draws
        edge-to-edge — so the keyboard simply painted over the composer. See
        useKeyboardInset. When the keyboard is closed this resolves to the
        navigation-bar inset, which keeps the composer off the system keys.
      */}
      <View style={{ flex: 1, paddingBottom: bottomInset }}>
        <View style={{ flex: 1 }}>
          {loading ? (
            <ThreadSkeleton />
          ) : messages.length === 0 ? (
            <ThreadEmptyState name={peerName} onQuickReply={setDraft} />
          ) : (
            <FlatList
              data={rows}
              inverted
              keyExtractor={(row) =>
                row.type === 'day' ? row.key : (localIdByServerId.get(row.message.id) ?? row.message.id)
              }
              renderItem={({ item: row }) =>
                row.type === 'day' ? (
                  <DaySeparator label={row.label} />
                ) : row.message.callEvent ? (
                  <CallEventBubble
                    event={row.message.callEvent}
                    timeLabel={formatBubbleTime(row.message.createdAt)}
                    mine={row.message.mine}
                  />
                ) : chatMessageIsSchedule(row.message) ? (
                  <ScheduleCard
                    message={row.message}
                    onAction={(action) => scheduleAction(row.message.id, action)}
                    onReschedule={() => reschedule(row.message.id, row.message.scheduledAt)}
                    onJoin={call}
                  />
                ) : (
                  <MessageBubble message={row.message} showTail={row.showTail} onRetry={() => send(row.message)} />
                )
              }
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onEndReached={loadOlder}
              onEndReachedThreshold={0.6}
              ListFooterComponent={
                loadingOlder ? (
                  <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {context ? <CreditsBanner context={context} onBuyMinutes={buyMinutes} /> : null}

        <Composer draft={draft} canSend={canSend} onChange={setDraft} onSend={() => send()} />
      </View>
    </View>
  );
}

/* ─────────────────────────────── Header ─────────────────────────────── */

function HeaderIcon({ icon, onPress, tint = colors.primary }: { icon: AppIconName; onPress: () => void; tint?: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, ...spring.snappy }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...spring.bouncy }).start()}
        hitSlop={4}
        style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppIcon name={icon} size={20} color={tint} />
      </Pressable>
    </Animated.View>
  );
}

function ThreadHeader({
  name,
  avatarKey,
  context,
  onBack,
  onSchedule,
  onCall,
}: {
  name: string;
  avatarKey?: string;
  context?: ConversationContext;
  onBack: () => void;
  onSchedule: () => void;
  onCall?: () => void;
}) {
  // Live, real data under the name: the paying client sees their remaining
  // time with this pro; everyone else gets the action hint.
  let subtitle = 'Chat · Schedule · Call';
  let dotColor: string = colors.success;
  if (context?.viewerIsClient) {
    const seconds = context.secondsRemaining;
    if (seconds <= 0) {
      subtitle = 'Out of minutes';
      dotColor = colors.error;
    } else {
      subtitle = `${formatSecondsAsDuration(seconds)} remaining`;
      dotColor = seconds <= context.lowSecondsThreshold ? colors.warning : colors.success;
    }
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 6, paddingRight: 14, paddingTop: 6, paddingBottom: 12 }}>
      <HeaderIcon icon="back" tint={colors.textJet} onPress={onBack} />
      <AppAvatar fileKey={avatarKey} resolveUri={fileService.mintViewUri} name={name} size={44} />
      <View style={{ width: 12 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="700" color={colors.textJet} align="left" numberOfLines={1} style={{ fontSize: 16 }}>
          {name}
        </AppText>
        <View style={{ height: 3 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dotColor }} />
          <View style={{ width: 5 }} />
          <AppText variant="bodySmall" weight="500" color={colors.textMuted} align="left" numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
      </View>
      <View style={{ width: 10 }} />
      {/* Joined action pill — schedule + call live together in one control. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 21,
          backgroundColor: colors.surfaceDark,
          overflow: 'hidden',
        }}
      >
        <HeaderIcon icon="event" onPress={onSchedule} />
        {onCall ? (
          <>
            <View style={{ width: 1, height: 20, backgroundColor: colors.secondary }} />
            <HeaderIcon icon="phone" onPress={onCall} />
          </>
        ) : null}
      </View>
    </View>
  );
}

/* ─────────────────────────────── Composer ────────────────────────────── */

/**
 * Composer — no sheet, no shared box. A compact white input pill and a
 * separate circular send button float side by side directly on the canvas,
 * matched in height. The send disc is quiet white when idle and the primary
 * disc springs in over it the moment there's something to send.
 */
function Composer({ draft, canSend, onChange, onSend }: { draft: string; canSend: boolean; onChange: (v: string) => void; onSend: () => void }) {
  const canSubmit = canSend && draft.trim().length > 0;
  const active = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(active, { toValue: canSubmit ? 1 : 0, useNativeDriver: true, ...spring.snappy }).start();
  }, [canSubmit, active]);

  const floatShadow = {
    shadowColor: '#3D3A6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  } as const;

  // No bottom SafeAreaView here: the screen's container already reserves the
  // keyboard-or-navigation-bar inset (see useKeyboardInset). Claiming the inset
  // again would stack the two and leave a gap above the keyboard.
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, gap: 10 }}>
        <View
          style={{
            flex: 1,
            minHeight: 46,
            justifyContent: 'center',
            borderRadius: 23,
            backgroundColor: colors.background,
            paddingHorizontal: 18,
            paddingVertical: 12,
            ...floatShadow,
          }}
        >
          {/* numberOfLines={1} keeps the web textarea to one row (browser
           * default is two); the pill still grows with content up to maxHeight. */}
          <TextInput
            value={draft}
            onChangeText={onChange}
            editable={canSend}
            multiline
            numberOfLines={1}
            placeholder={canSend ? 'Type a message…' : 'Buy minutes to keep chatting'}
            placeholderTextColor={colors.textSlate}
            style={{
              fontFamily: 'MonaSans-Regular',
              fontSize: 15,
              lineHeight: 20,
              color: colors.textJet,
              maxHeight: 120,
              paddingTop: 0,
              paddingBottom: 0,
            }}
          />
        </View>
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <Pressable
            onPress={onSend}
            disabled={!canSubmit}
            onPressIn={() => Animated.spring(pressScale, { toValue: 0.88, useNativeDriver: true, ...spring.snappy }).start()}
            onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, ...spring.bouncy }).start()}
            style={{ width: 46, height: 46 }}
          >
            {/* Idle disc — quiet white, always there. */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 23,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: active.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                ...floatShadow,
              }}
            >
              <AppIcon name="send" size={19} color={colors.textSlate} />
            </Animated.View>
            {/* Active disc — springs in over the idle one. */}
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 23,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: active,
                transform: [{ scale: active.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.32,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <AppIcon name="send" size={19} color={colors.textWhite} />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

/* ─────────────────────────── Loading / separators ────────────────────── */

/** Bubble-shaped skeletons alternating sides — the thread's silhouette
 * instead of a bare spinner. */
function ThreadSkeleton() {
  const shapes: Array<{ mine: boolean; width: number; height: number }> = [
    { mine: false, width: 210, height: 52 },
    { mine: false, width: 150, height: 38 },
    { mine: true, width: 190, height: 44 },
    { mine: false, width: 240, height: 60 },
    { mine: true, width: 130, height: 38 },
    { mine: true, width: 220, height: 52 },
    { mine: false, width: 170, height: 42 },
  ];
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'flex-end' }}>
      {shapes.map((s, i) => (
        <View key={i} style={{ alignItems: s.mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
          <Skeleton width={s.width} height={s.height} borderRadius={20} />
        </View>
      ))}
    </View>
  );
}

/** "── Today ──" — a label flanked by hairlines, airier than a pill. */
function DaySeparator({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 24 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.secondary }} />
      <View style={{ paddingHorizontal: 12 }}>
        <AppText variant="bodySmall" weight="600" color={colors.textSlate}>
          {label}
        </AppText>
      </View>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.secondary }} />
    </View>
  );
}

/* ──────────────────────────── Row-building ───────────────────────────── */

type ThreadRow =
  | { type: 'day'; key: string; label: string }
  | { type: 'message'; message: OptimisticChatMessage; showTail: boolean };

/** Interleaves day separators and decides which bubbles show a tail — a tail
 * appears on the last message of a run from the same sender, so consecutive
 * bubbles read as one grouped stack (the messenger convention). */
function buildRows(messages: OptimisticChatMessage[]): ThreadRow[] {
  const rows: ThreadRow[] = [];
  let lastDay = '';

  messages.forEach((message, i) => {
    const day = formatDayLabel(message.createdAt);
    if (day && day !== lastDay) {
      rows.push({ type: 'day', key: `day-${day}-${message.id}`, label: day });
      lastDay = day;
    }
    const next = messages[i + 1];
    const showTail = !next || next.mine !== message.mine || chatMessageIsSchedule(next);
    rows.push({ type: 'message', message, showTail });
  });

  return rows;
}

/** Merges a freshly-fetched page-one list with the current state, preserving
 * (a) in-flight/"failed" local messages the server doesn't know yet — a
 * silent poll must never drop a bubble mid-send — and (b) older history pages
 * the user has scrolled into, which sit before the fetched window. */
function reconcile(prev: OptimisticChatMessage[], fetched: OptimisticChatMessage[]): OptimisticChatMessage[] {
  const fetchedIds = new Set(fetched.map((m) => m.id));
  const oldestFetched = fetched[0]?.createdAt ?? '';
  const olderHistory = prev.filter(
    (m) => !fetchedIds.has(m.id) && m.deliveryStatus === 'sent' && oldestFetched !== '' && m.createdAt < oldestFetched,
  );
  const pendingLocal = prev.filter((m) => m.deliveryStatus !== 'sent' && !fetchedIds.has(m.id));
  return [...olderHistory, ...fetched, ...pendingLocal];
}
