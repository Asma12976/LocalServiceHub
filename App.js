// App.js
import 'react-native-gesture-handler'; // must be the very first import
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './src/navigation/AuthNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { UserProvider } from './src/context/UserContext';
import { BookingsProvider } from './src/context/BookingsContext';
import { ProviderProvider } from './src/context/ProviderContext';
import { ChatProvider } from './src/context/ChatContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { navigationRef } from './src/utils/navigationRef';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <UserProvider>
            <ProviderProvider>
              {/* ChatProvider + NotificationProvider both need the logged-in
                  uid from UserContext (who am I / who is this message for),
                  so they sit right after it, above the screens that consume
                  them (Home's header icons, MessagesScreen, ChatScreen,
                  NotificationsScreen - see CustomerNavigator.js). */}
              <ChatProvider>
                <NotificationProvider>
                  <FavoritesProvider>
                    <BookingsProvider>
                      {/* ref lets NotificationContext navigate to a chat/screen
                          when the user taps a device notification, even though
                          that handler lives outside the navigator's React tree. */}
                      <NavigationContainer ref={navigationRef}>
                        <StatusBar style="light" />
                        <AuthNavigator />
                      </NavigationContainer>
                    </BookingsProvider>
                  </FavoritesProvider>
                </NotificationProvider>
              </ChatProvider>
            </ProviderProvider>
          </UserProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
