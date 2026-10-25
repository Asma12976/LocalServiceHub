// src/navigation/CustomerNavigator.js

import React, { useMemo } from 'react';

import { createDrawerNavigator } from '@react-navigation/drawer';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CustomerTabNavigator from './CustomerTabNavigator';

import DrawerContent from './DrawerContent';

import ProviderDetailsScreen from '../screens/customer/ProviderDetailsScreen';

import FavoritesScreen from '../screens/customer/FavoritesScreen';

import EditProfileScreen from '../screens/customer/EditProfileScreen';

import BookingScreen from '../screens/customer/BookingScreen';

import BookingConfirmationScreen from '../screens/customer/BookingConfirmationScreen';

import BookingDetailsScreen from '../screens/customer/BookingDetailsScreen';

import ReviewsScreen from '../screens/customer/Reviewsscreen';

import ProviderReviewsScreen from '../screens/customer/ProviderReviewsScreen';

import EmergencyServiceScreen from '../screens/customer/Emergencyservicescreen';

import NearMeScreen from '../screens/customer/NearMeScreen';

import ProviderDashboardScreen from '../screens/provider/ProviderDashboardScreen';

import ProviderProfileSetupScreen from '../screens/provider/ProviderProfileSetupScreen';

import ProviderBookingsScreen from '../screens/provider/ProviderBookingsScreen';

import ProviderBookingDetailsScreen from '../screens/provider/ProviderBookingDetailsScreen';

import ProviderMyReviewsScreen from '../screens/provider/ProviderMyReviewsScreen';

import MessagesScreen from '../screens/customer/MessagesScreen';

import ChatScreen from '../screens/customer/ChatScreen';

import NotificationsScreen from '../screens/customer/NotificationsScreen';

import SettingsScreen from '../screens/customer/SettingsScreen';

import ChangePasswordScreen from '../screens/ChangePasswordScreen';

import HelpSupportScreen from '../screens/customer/HelpSupportScreen';

import AIAssistantScreen from '../screens/customer/AIAssistantScreen';

import { useTheme } from '../context/ThemeContext';

const Drawer = createDrawerNavigator();

const Stack = createNativeStackNavigator();

function CustomerDrawer() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(10, 15, 31, 0.5)',
        drawerStyle: {
          width: '78%',
          backgroundColor: colors.surface,
        },
      }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen
        name="CustomerTabs"
        component={CustomerTabNavigator}
      />
    </Drawer.Navigator>
  );
}

export default function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="CustomerRoot"
        component={CustomerDrawer}
      />

      <Stack.Screen
        name="ProviderDetails"
        component={ProviderDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="BookingScreen"
        component={BookingScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmationScreen}
        options={{
          animation: 'slide_from_right',
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="MyReviews"
        component={ReviewsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="ProviderReviews"
        component={ProviderReviewsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="EmergencyService"
        component={EmergencyServiceScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="NearMe"
        component={NearMeScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="ProviderDashboard"
        component={ProviderDashboardScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="ProviderProfileSetup"
        component={ProviderProfileSetupScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="ProviderBookings"
        component={ProviderBookingsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="ProviderBookingDetails"
        component={ProviderBookingDetailsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="ProviderMyReviews"
        component={ProviderMyReviewsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}