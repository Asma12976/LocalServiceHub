// src/screens/customer/NotificationsScreen.js
// Every notification the logged-in account has received. Today that's just
// "type: message", but NotificationRow already keys its icon off
// `notification.type` so booking/review/etc. notifications can be added
// later (see pushNotification in src/utils/notify.js) without touching this
// screen.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import NotificationRow from '../../components/NotificationRow';
import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, markAsReadById, markAllAsRead, handleNotificationOpen } =
    useNotifications();

  const handlePress = (notification) => {
    markAsReadById(notification.id);
    handleNotificationOpen({ ...notification.data, type: notification.type, notifId: notification.id });
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
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 ? (
              <TouchableOpacity onPress={markAllAsRead} hitSlop={10} style={styles.markAllBtn}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.circleBtnSpacer} />
            )}
          </View>

          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </Text>
        </LinearGradient>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => handlePress(item)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-outline" size={36} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              New messages and updates about your bookings will show up here.
            </Text>
          </View>
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
  markAllBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  markAllText: {
    color: colors.white,
    fontSize: 11.5,
    fontWeight: '700',
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