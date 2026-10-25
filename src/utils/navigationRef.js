// src/utils/navigationRef.js
// A navigation ref that lives outside the React tree so code that isn't a
// screen — e.g. NotificationContext's "user tapped a notification" handler,
// which fires from an OS-level event listener — can still navigate.
// Attach it to <NavigationContainer ref={navigationRef}> in App.js.
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

// Always route through the nested stacks explicitly so this works no matter
// which screen is currently focused (Chat/Messages/Notifications all live
// on the root stack inside CustomerNavigator - see CustomerNavigator.js).
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
