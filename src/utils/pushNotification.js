// src/utils/pushNotifications.js
// Centralizes the "is expo-notifications safe to load here" check (see the
// long comment at the top of NotificationContext.js for the Expo Go +
// Android crash it's working around) plus a couple of small permission
// helpers, so SettingsScreen's real "Push Notifications" toggle and
// NotificationContext's OS pop-ups agree on the exact same rules instead of
// each re-implementing the detection separately.
import { Platform, Linking } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const notificationsSupported = !(Platform.OS === 'android' && isExpoGo);

let Notifications = null;

if (notificationsSupported) {
  try {
    // eslint-disable-next-line global-require
    Notifications = require('expo-notifications');
  } catch (err) {
    console.log('expo-notifications unavailable:', err?.message);
    Notifications = null;
  }
}

export { Notifications };

// Returns 'granted' | 'denied' | 'undetermined' | 'unsupported'
export async function getPermissionStatus() {
  if (!Notifications) return 'unsupported';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (err) {
    console.log('getPermissionStatus failed:', err?.message);
    return 'unsupported';
  }
}

// Triggers the OS permission prompt. This only actually shows anything the
// very first time an app asks — once the user has answered (either way),
// iOS/Android just hand back that same answer silently from then on, which
// is why turning the Settings switch on again later has to fall back to
// openDeviceSettings() instead of expecting this to prompt again.
export async function requestPermission() {
  if (!Notifications) return 'unsupported';
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  } catch (err) {
    console.log('requestPermission failed:', err?.message);
    return 'unsupported';
  }
}

// Deep-links into this app's page in the OS Settings app. No app can flip
// its own OS notification permission on/off directly - once the user has
// answered the permission prompt once, actually turning it on or off has
// to happen there.
export function openDeviceSettings() {
  Linking.openSettings().catch((err) =>
    console.log('openSettings failed:', err?.message)
  );
}
