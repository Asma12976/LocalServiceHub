// src/navigation/AdminNavigator.js
// Root of the Admin Panel. Reached from AuthNavigator's "AdminApp" screen
// only when the logged-in account's Firestore role is 'admin' (checked in
// LoginScreen right after sign-in — see the comment there). A
// customer/provider account can never land here.
//
// AdminProvider is mounted right here (not in App.js alongside the other
// providers) so its "read every booking in the whole app" Firestore
// listener only ever runs for an actual admin session, not for every
// customer/provider who opens the app.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminProvider } from '../context/AdminContext';
import { useTheme } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminProvidersScreen from '../screens/admin/AdminProvidersScreen';
import AdminProviderDetailsScreen from '../screens/admin/AdminProviderDetailsScreen';
import AdminDisputesScreen from '../screens/admin/AdminDisputesScreen';
import AdminReviewsScreen from '../screens/admin/AdminReviewsScreen';
import AdminMessagesScreen from '../screens/admin/AdminMessagesScreen';
import AdminChatScreen from '../screens/admin/AdminChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Dashboard: 'grid-outline',
  Providers: 'briefcase-outline',
  Disputes: 'alert-circle-outline',
  Reviews: 'star-outline',
  Messages: 'chatbubbles-outline',
};

function AdminTabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeTabBarStyles(colors), [colors]);
  // Badges the Messages tab the same way DrawerContent.js badges it for the
  // customer/provider app — so an admin can tell at a glance that a
  // customer/provider replied to a dispute resolution without opening the
  // tab first.
  const { totalUnreadMessages } = useChat();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;
        const badgeCount = route.name === 'Messages' ? totalUnreadMessages : 0;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <View key={route.key} style={styles.tabItemWrap}>
            <View>
              <Ionicons.Button
                name={TAB_ICONS[route.name] || 'ellipse-outline'}
                backgroundColor="transparent"
                underlayColor="transparent"
                iconStyle={{ marginRight: 0 }}
                size={21}
                color={isFocused ? colors.accent : colors.textSecondary}
                onPress={onPress}
                style={styles.iconBtn}
              />
              {badgeCount > 0 ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                </View>
              ) : null}
            </View>
            <Text
              style={[styles.tabLabel, isFocused && { color: colors.accent, fontWeight: '800' }]}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function makeTabBarStyles(colors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    tabItemWrap: {
      flex: 1,
      alignItems: 'center',
    },
    iconBtn: {
      padding: 0,
      margin: 0,
    },
    tabBadge: {
      position: 'absolute',
      top: -2,
      right: 2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 3,
      backgroundColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    tabBadgeText: {
      color: colors.white,
      fontSize: 9,
      fontWeight: '800',
    },
    tabLabel: {
      fontSize: 10.5,
      color: colors.textSecondary,
      marginTop: 2,
      fontWeight: '600',
    },
  });
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AdminTabBar {...props} />}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Providers" component={AdminProvidersScreen} />
      <Tab.Screen name="Disputes" component={AdminDisputesScreen} />
      <Tab.Screen name="Reviews" component={AdminReviewsScreen} />
      <Tab.Screen name="Messages" component={AdminMessagesScreen} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <AdminProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AdminRoot" component={AdminTabs} />
        <Stack.Screen
          name="AdminProviderDetails"
          component={AdminProviderDetailsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        {/* Reached from the Messages tab (AdminMessagesScreen) when a
            customer/provider replies to a dispute-resolution message — see
            AdminContext.js's notifyPartyViaChat. Registered on this Stack
            (not inside AdminTabs) the same way AdminProviderDetails is, so
            it opens full-screen over the tab bar instead of as a tab. */}
        <Stack.Screen
          name="Chat"
          component={AdminChatScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </AdminProvider>
  );
}