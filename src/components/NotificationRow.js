// src/components/NotificationRow.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { formatRelativeTime } from '../utils/dateFormat';

const ICONS_BY_TYPE = {
  message: 'chatbubble-ellipses',
  booking: 'calendar',
  default: 'notifications',
};

export default function NotificationRow({ notification, onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const iconName = ICONS_BY_TYPE[notification.type] || ICONS_BY_TYPE.default;

  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.row} onPress={onPress}>
      <View style={[styles.iconWrap, !notification.read && styles.iconWrapUnread]}>
        <Ionicons
          name={iconName}
          size={18}
          color={notification.read ? colors.textSecondary : colors.accent}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, !notification.read && styles.titleUnread]} numberOfLines={1}>
          {notification.title || 'Notification'}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body || ''}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(notification.createdAt)}</Text>
      </View>

      {!notification.read ? <View style={styles.unreadDot} /> : null}
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconWrapUnread: {
    backgroundColor: colors.circleTint,
  },
  info: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    fontSize: 14,
    color: colors.textSecondary,
  },
  titleUnread: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  body: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  time: {
    ...typography.small,
    color: colors.placeholder,
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: spacing.sm,
    marginTop: 6,
  },
});
}