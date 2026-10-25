// src/navigation/AuthNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import CustomerNavigator from './CustomerNavigator';
import AdminNavigator from './AdminNavigator';

const Stack = createNativeStackNavigator();

// NOTE: This is a single root stack — Auth screens (Splash/Login/Signup/
// ForgotPassword) and the main app (MainApp = Drawer + Bottom Tabs) all live
// here as siblings, so navigation.navigate('MainApp') from LoginScreen works
// without any extra wiring. Swap this for a real logged-in/logged-out split
// (e.g. driven by an auth state) once real authentication is in place.
//
// "AdminApp" (AdminNavigator) was added the same way, as a sibling —
// LoginScreen checks the signed-in account's Firestore role right after
// sign-in and resets to whichever one applies (see the comment there).
export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="MainApp" component={CustomerNavigator} />
      <Stack.Screen name="AdminApp" component={AdminNavigator} />
    </Stack.Navigator>
  );
}