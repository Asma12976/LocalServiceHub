// src/navigation/DrawerContent.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { spacing, radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { useChat } from '../context/ChatContext';
import { useNotifications } from '../context/NotificationContext';

const DRAWER_ITEMS = [
  { icon: 'home-outline', label: 'Home', tab: 'Home' },
  { icon: 'heart-outline', label: 'Favorites', route: 'Favorites' },
  { icon: 'calendar-outline', label: 'My Bookings', tab: 'Bookings' },
  { icon: 'chatbubble-outline', label: 'Messages', route: 'Messages', badgeKey: 'messages' },
  { icon: 'notifications-outline', label: 'Notifications', route: 'Notifications', badgeKey: 'notifications' },
  { icon: 'alert-circle-outline', label: 'Emergency Service', route: 'EmergencyService' },
  { icon: 'help-circle-outline', label: 'Help & Support', route: 'HelpSupport' },
  { icon: 'settings-outline', label: 'Settings', route: 'Settings' },
];

export default function DrawerContent(props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { navigation } = props;
  const { user } = useUser();
  const { totalUnreadMessages } = useChat();
  const { unreadCount } = useNotifications();

  const badgeCounts = {
    messages: totalUnreadMessages,
    notifications: unreadCount,
  };

  const handlePress = (item) => {
    navigation.closeDrawer();
    if (item.tab) {
      // Jump to a tab inside the nested CustomerTabs navigator.
      navigation.navigate('CustomerTabs', { screen: item.tab });
    } else if (item.route) {
      // Bubbles up to the Stack that sits above this Drawer (see
      // CustomerNavigator.js) — e.g. the full-screen Favorites screen.
      navigation.navigate(item.route);
    } else {
      Alert.alert(item.label, 'This screen is coming soon.');
    }
  };

  const handleLogout = () => {
    navigation.closeDrawer();
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
      },
    ]);
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={styles.scrollView}
      contentContainerStyle={styles.container}
    >
      <LinearGradient
        colors={[colors.accentGradientStart, colors.accentGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerInner}>
          <View style={styles.avatar}>
  <Ionicons name="person" size={28} color={colors.white} />
</View>

<View style={{ marginLeft: spacing.md }}>
  <Text style={styles.name}>{user?.name || 'Guest'}</Text>
  <Text style={styles.email}>{user?.email || ''}</Text>
</View>
        </View>
      </LinearGradient>

      <View style={styles.menu}>
        {DRAWER_ITEMS.map((item) => {
          const count = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.menuRow}
              onPress={() => handlePress(item)}
            >
              <Ionicons name={item.icon} size={20} color={colors.textPrimary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              {count > 0 ? (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{count > 9 ? '9+' : count}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.menuLabel, styles.logoutLabel]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  header: {
    marginHorizontal: -9999,
    paddingHorizontal: 9999,
    overflow: 'hidden',
  },
headerInner: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingTop: spacing.xxl,
  paddingBottom: spacing.lg,
  marginLeft: -9999,
  marginRight: -10050,
  paddingLeft: 9999,
  paddingRight: spacing.lg + 10050,
},
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  name: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  email: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  menu: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 0,
    borderRadius: radius.sm,
  },
  menuLabel: {
    marginLeft: spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  menuBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  logoutLabel: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
  },
});
}