 // src/config/googleAuth.js
// "Sign in with Google" client IDs — kept in their own file, same pattern
// as the Cloudinary constants in UserContext/ProviderContext, so
// LoginScreen.js doesn't have to carry this setup detail itself.
//
// IMPORTANT — fill these in before the Google button will work:
//   1. Firebase Console → Authentication → Sign-in method → Google → Enable.
//      This auto-creates a "Web client" OAuth client in the same Google
//      Cloud project — copy its Client ID into GOOGLE_WEB_CLIENT_ID below.
//   2. Google Cloud Console → APIs & Services → Credentials → Create
//      Credentials → OAuth client ID → iOS, using this app's
//      ios.bundleIdentifier (app.json) → copy into GOOGLE_IOS_CLIENT_ID.
//   3. Same, but Android type, using android.package + your build's
//      signing SHA-1 (`eas credentials` → Android → Keystore) → copy into
//      GOOGLE_ANDROID_CLIENT_ID.
//
// GOOGLE_WEB_CLIENT_ID is the one that matters everywhere, even on native:
// it's what Firebase checks the ID token's `aud` claim against, so
// signInWithCredential rejects the token if only the iOS/Android id is set.
//
// These are public client IDs, not secrets, so hardcoding them here (like
// firebaseConfig in src/config/firebase.js) is fine.
//
// NOTE: Google sign-in needs a real Development Build (`npx expo run:ios` /
// `run:android`, or an EAS dev build) — it will NOT work inside Expo Go,
// since Expo Go can't complete the OAuth redirect back into the app.

export const GOOGLE_WEB_CLIENT_ID = '249409614337-u3td55gsoa7ckdo9sn5v1ua7dl49srmf.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID = '';

export const GOOGLE_ANDROID_CLIENT_ID =
  '450917334757-pm3hje75m4pu13thfl8o0l32pa4nlofq.apps.googleusercontent.com';