import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, colors } from '@ohlify/mobile-ui';
import { Fragment, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { chatApi } from '../api/chat-api';
import type { ChatsStackParamList } from '../../../main-tabs.navigation';
import type { Conversation } from '../types/chat-models';

type ChatsNavigation = NativeStackNavigationProp<ChatsStackParamList>;

/** The Chats tab — a list of conversations. Tapping opens the thread. Mirrors mobile/lib/features/chat/screen/chats_screen.dart. */
export function ChatsScreen() {
  const navigation = useNavigation<ChatsNavigation>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    chatApi
      .listConversations()
      .then((list) => {
        if (!cancelled) setConversations(list);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={{ height: 8 }} />
        <AppText variant="header" weight="700" color={colors.textJet} align="left">
          Chats
        </AppText>
        <View style={{ height: 12 }} />
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="body" color={colors.textMuted} align="center">
              No conversations yet. Buy minutes with a professional to start chatting.
            </AppText>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {conversations.map((c, i) => (
              <Fragment key={c.id}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
                <ConversationTile conversation={c} onTap={() => navigation.navigate('ChatThread', { conversationId: c.id })} />
              </Fragment>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function ConversationTile({ conversation, onTap }: { conversation: Conversation; onTap: () => void }) {
  const initial = (conversation.peerName ?? '?').charAt(0).toUpperCase();
  return (
    <Pressable onPress={onTap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="body" weight="700" color={colors.textJet}>
            {initial}
          </AppText>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="600" color={colors.textJet} align="left">
            {conversation.peerName ?? 'Professional'}
          </AppText>
          <AppText variant="bodySmall" color={colors.textMuted} align="left" numberOfLines={1}>
            {conversation.lastMessagePreview ?? 'Say hello'}
          </AppText>
        </View>
        {conversation.unreadCount > 0 ? (
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, backgroundColor: colors.primary, borderRadius: 999 }}>
            <Text style={{ fontFamily: 'MonaSans-Bold', fontSize: 12, fontWeight: '700', color: colors.textWhite }}>{conversation.unreadCount}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
