import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppAvatar, AppIcon, AppText, colors, stagger } from '@ohlify/mobile-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';
import { fileService } from '@shared/services/file-service';

import type { RootStackParamList } from '../../../app.navigation';
import { useConversations } from '../api/use-conversations';
import { BannerPlacement } from '@features/banners/api/use-banner';
import { BannerSlot } from '@features/banners/screen/banner-slot';
import { queryKeys } from '@shared/api/query-keys';
import { usePullToRefresh } from '@shared/api/use-refresh-state';
import { formatChatListTime } from '../helpers/format-chat-time';
import { ChatEmptyState } from './parts/chat-empty-state';
import { ChatErrorState } from './parts/chat-error-state';
import { ChatSearchBar } from './parts/chat-search-bar';
import { ConversationListSkeleton } from './parts/conversation-skeleton';
import type { Conversation } from '../types/chat-models';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Poll the conversation list every 12s while the tab is focused so a new
 * inbound message (or unread bump) shows up without a manual refresh. */

const PAGE_SIZE = 20;

/**
 * The Chats tab — floating white conversation cards on a lavender wash, a
 * search field to filter them, and cursor-driven infinite scroll. Tapping a
 * card opens the full-screen thread. Mirrors
 * mobile/lib/features/chat/screen/chats_screen.dart.
 */
export function ChatsScreen() {
  const navigation = useNavigation<RootNavigation>();
  const [query, setQuery] = useState('');
  const conversationsQuery = useConversations();
  const { isRefreshing, onRefresh } = usePullToRefresh(queryKeys.conversations());

  const conversations = useMemo(
    () => conversationsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [conversationsQuery.data],
  );
  const error = conversationsQuery.error instanceof ApiError ? conversationsQuery.error : undefined;

  function loadMore() {
    if (query.trim() || !conversationsQuery.hasNextPage || conversationsQuery.isFetchingNextPage) {
      return;
    }
    void conversationsQuery.fetchNextPage();
  }

  function openThread(c: Conversation) {
    navigation.navigate('ChatThread', {
      conversationId: c.id,
      peerName: c.peerName,
      peerAvatarUrl: c.peerAvatarUrl,
    });
  }

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmedQuery) return conversations;
    return conversations.filter(
      (c) =>
        (c.peerName ?? '').toLowerCase().includes(trimmedQuery) ||
        (c.lastMessagePreview ?? '').toLowerCase().includes(trimmedQuery),
    );
  }, [conversations, trimmedQuery]);

  const unreadChats = conversations.filter((c) => c.unreadCount > 0)?.length;
  const showSearch = conversations.length > 0 || trimmedQuery.length > 0;
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceDark }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText variant="header" weight="800" color={colors.textJet} align="left">
            Chats
          </AppText>
          <View style={{ flex: 1 }} />
          {unreadChats > 0 ? (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primary }}>
              <AppText variant="bodySmall" weight="700" color={colors.textWhite}>
                {unreadChats} new
              </AppText>
            </View>
          ) : null}
        </View>
        {showSearch ? (
          <View style={{ paddingTop: 14 }}>
            <ChatSearchBar value={query} onChangeText={setQuery} />
          </View>
        ) : null}
        <BannerSlot placement={BannerPlacement.CHATS} />
      </View>

      {/*
        Gated on "there is nothing to show yet" rather than `isLoading`.
        `isLoading` stays true for the whole offline retry sequence (three
        attempts with exponential backoff under networkMode 'offlineFirst'), so
        keying the skeleton off it left a restored-from-cache list sitting behind
        a spinner while a doomed fetch ran — the thread was cached, but never
        rendered. With `data` present the list paints immediately and the
        refetch updates it if it lands.
      */}
      {conversationsQuery.data === undefined && conversationsQuery.isFetching ? (
        <ConversationListSkeleton />
      ) : error && conversations?.length === 0 ? (
        <ChatErrorState message={apiErrorMessage(error)} isNetwork={error.isNetwork} onRetry={() => void conversationsQuery.refetch()} />
      ) : conversations?.length === 0 ? (
        <ChatEmptyState onBrowse={() => navigation.navigate('Professionals', undefined)} />
      ) : filtered?.length === 0 ? (
        <SearchEmptyState query={query.trim()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index }) => <ConversationCard conversation={item} index={index} onPress={() => openThread(item)} />}
          ItemSeparatorComponent={CardGap}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: 2 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
          ListFooterComponent={
            conversationsQuery.isFetchingNextPage ? (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : !conversationsQuery.hasNextPage && !trimmedQuery && conversations?.length >= PAGE_SIZE ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <AppText variant="bodySmall" color={colors.textSlate}>
                  You’re all caught up
                </AppText>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function CardGap() {
  return <View style={{ height: 10 }} />;
}

/** Shown when the search query matches nothing in the loaded list. */
function SearchEmptyState({ query }: { query: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingTop: 72, paddingHorizontal: 40 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#3D3A6E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <AppIcon name="search" size={30} color={colors.textSlate} />
      </View>
      <View style={{ height: 16 }} />
      <AppText variant="medium" weight="700" color={colors.textJet} align="center">
        No chats found
      </AppText>
      <View style={{ height: 6 }} />
      <AppText variant="body" color={colors.textMuted} align="center">
        Nothing matches “{query}”. Try a different name or keyword.
      </AppText>
    </View>
  );
}

/**
 * A floating conversation card — white on the lavender wash, ringed avatar
 * when unread, name + relative time, preview + trailing unread pill. Cards
 * cascade in with a staggered fade+slide on first paint and compress subtly
 * under the finger on press.
 */
function ConversationCard({ conversation, index, onPress }: { conversation: Conversation; index: number; onPress: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      delay: Math.min(index, stagger.maxStaggeredItems) * stagger.perItemDelayMs,
      useNativeDriver: true,
    }).start();
    // Mount-only — a poll re-ordering the list must not replay the cascade.
  }, []);

  const opacity = progress;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale: pressScale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 20, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start()}
        android_ripple={{ color: colors.callico, borderless: false }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          borderRadius: 22,
          backgroundColor: colors.background,
          shadowColor: '#3D3A6E',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: hasUnread ? 0.1 : 0.05,
          shadowRadius: 12,
          elevation: hasUnread ? 3 : 1,
        }}
      >
        {/* Unread ring — a 2px primary halo around the avatar. */}
        <View
          style={{
            padding: 2,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: hasUnread ? colors.primary : 'transparent',
          }}
        >
          <AppAvatar fileKey={conversation.peerAvatarUrl} resolveUri={fileService.mintViewUri} name={conversation.peerName} size={50} />
        </View>

        <View style={{ width: 13 }} />

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <AppText
                variant="body"
                weight={hasUnread ? '700' : '600'}
                color={colors.textJet}
                align="left"
                numberOfLines={1}
                style={{ fontSize: 15 }}
              >
                {conversation.peerName ?? 'Professional'}
              </AppText>
            </View>
            <View style={{ width: 8 }} />
            <AppText variant="bodySmall" weight={hasUnread ? '700' : '500'} color={hasUnread ? colors.primary : colors.textSlate}>
              {formatChatListTime(conversation.lastMessageAt)}
            </AppText>
          </View>
          <View style={{ height: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <AppText
                variant="bodyNormal"
                weight={hasUnread ? '600' : '400'}
                color={hasUnread ? colors.textCharcoal : colors.textMuted}
                align="left"
                numberOfLines={1}
              >
                {conversation.lastMessagePreview ?? 'Say hello 👋'}
              </AppText>
            </View>
            {hasUnread ? (
              <>
                <View style={{ width: 8 }} />
                <View
                  style={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                  }}
                >
                  <AppText variant="bodySmall" weight="700" color={colors.textWhite}>
                    {conversation.unreadCount > 99 ? '99+' : String(conversation.unreadCount)}
                  </AppText>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
