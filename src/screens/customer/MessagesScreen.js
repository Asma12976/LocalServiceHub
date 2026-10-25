// src/screens/customer/MessagesScreen.js
// The "Chats" list — every conversation the logged-in account (customer OR
// provider, there's no separate provider app) is part of. Opened from the
// chat-bubble icon on Home's header, or by tapping a message notification.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import ConversationRow from '../../components/ConversationRow';
import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { useChat } from '../../context/ChatContext';

export default function MessagesScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { conversations, loadingConversations, getOtherParticipant } = useChat();

  const handleOpenChat = (conversation) => {
    const otherUser = getOtherParticipant(conversation);
    navigation.navigate('Chat', { conversationId: conversation.id, otherUser });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <LinearGradient
          colors={[colors.navy, colors.navySoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn}>
              <Ionicons name="arrow-back" size={20} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={styles.circleBtnSpacer} />
          </View>

          <Text style={styles.headerSubtitle}>
            {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
          </Text>
        </LinearGradient>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            otherUser={getOtherParticipant(item)}
            myUid={user?.uid}
            onPress={() => handleOpenChat(item)}
          />
        )}
        ListEmptyComponent={
          !loadingConversations && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={36} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Open any provider's profile and tap "Message" to start chatting with them.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12.5,
    marginTop: spacing.md,
    marginLeft: 2,
  },

  listContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
}