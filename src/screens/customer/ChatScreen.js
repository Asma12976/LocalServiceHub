// src/screens/customer/ChatScreen.js
// One real-time chat thread. Reached two ways:
//   1. ProviderDetailsScreen "Message" button -> passes { otherUser } only,
//      the conversation doc is created (or reused) the moment this screen
//      mounts.
//   2. MessagesScreen row / a message notification tap -> passes both
//      { conversationId, otherUser } directly, no lookup needed.
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';

import ChatBubble from '../../components/ChatBubble';
import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { useChat } from '../../context/ChatContext';
import { setActiveConversationId } from '../../utils/notify';
import { isDifferentDay, formatDayDivider } from '../../utils/dateFormat';

export default function ChatScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { getOrCreateConversation, subscribeToMessages, sendMessage, markConversationRead } =
    useChat();

  const { otherUser } = route.params || {};
  const [conversationId, setConversationId] = useState(route.params?.conversationId || null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef(null);

  // ---------------------------------------------------------------------
  // Make sure a conversation doc exists, then subscribe to its messages.
  // ---------------------------------------------------------------------
  useEffect(() => {
    let unsubscribeMessages = () => {};
    let cancelled = false;

    (async () => {
      try {
        let id = conversationId;

        if (!id) {
          if (!otherUser?.uid) {
            throw new Error('Missing recipient.');
          }
          id = await getOrCreateConversation(otherUser);
          if (cancelled) return;
          setConversationId(id);
        }

        markConversationRead(id);

        unsubscribeMessages = subscribeToMessages(id, (msgs) => {
          if (!cancelled) {
            setMessages(msgs);
            setLoading(false);
          }
        });
      } catch (err) {
        console.log('ChatScreen setup failed:', err?.message);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeMessages();
    };
    // Only re-run if we're pointed at a genuinely different conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // ---------------------------------------------------------------------
  // While this screen is focused, tell NotificationContext which
  // conversation is "open" so a new message here doesn't also pop a device
  // notification on top of the live chat bubble that's already appearing.
  // Also re-zero the unread count whenever the screen regains focus.
  // ---------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (conversationId) {
        setActiveConversationId(conversationId);
        markConversationRead(conversationId);
      }
      return () => setActiveConversationId(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId])
  );

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || !otherUser?.uid || sending) return;

    setText('');
    setSending(true);
    try {
      await sendMessage(conversationId, otherUser.uid, trimmed);
      listRef.current?.scrollToEnd({ animated: true });
    } catch (err) {
      console.log('sendMessage failed:', err?.message);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item, index }) => {
    const previous = messages[index - 1];
    const showDivider = !previous || isDifferentDay(previous.createdAt, item.createdAt);

    return (
      <View>
        {showDivider ? (
          <View style={styles.dividerWrap}>
            <Text style={styles.dividerText}>{formatDayDivider(item.createdAt)}</Text>
          </View>
        ) : null}
        <ChatBubble message={item} isMine={item.senderId === user?.uid} />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <LinearGradient
          colors={[colors.navy, colors.navySoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>

          {otherUser?.photo ? (
            <Image source={{ uri: otherUser.photo }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
              <Ionicons name="person" size={18} color={colors.white} />
            </View>
          )}

          <Text style={styles.headerTitle} numberOfLines={1}>
            {otherUser?.name || 'Chat'}
          </Text>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.accent} />
              <Text style={styles.emptyText}>
                Say hello to {otherUser?.name || 'them'} 👋
              </Text>
            </View>
          }
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.placeholder}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={17} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: spacing.sm,
  },
  headerAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },

  dividerWrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    backgroundColor: colors.cardBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.placeholder,
  },
});
}