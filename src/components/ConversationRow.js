// src/components/ConversationRow.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { formatListTime } from '../utils/dateFormat';

export default function ConversationRow({ conversation, otherUser, myUid, onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const unread = conversation.unreadCount?.[myUid] || 0;
  const isLastFromMe = conversation.lastSenderId === myUid;
  const hasMessage = !!conversation.lastMessage;

  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.row} onPress={onPress}>
      <View style={styles.avatarWrap}>
        {otherUser?.photo ? (
          <Image source={{ uri: otherUser.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={22} color={colors.white} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {otherUser?.name || 'User'}
          </Text>
          <Text style={styles.time}>{formatListTime(conversation.lastMessageAt)}</Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, unread > 0 && styles.previewUnread]}
            numberOfLines={1}
          >
            {hasMessage ? `${isLastFromMe ? 'You: ' : ''}${conversation.lastMessage}` : 'Say hello 👋'}
          </Text>

          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.navy,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatarWrap: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
  },
  avatarFallback: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  time: {
    ...typography.small,
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  preview: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  previewUnread: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
}