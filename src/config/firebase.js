// src/config/firebase.js

import {
  initializeApp,
  getApps,
  getApp,
} from 'firebase/app';

import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getFirestore,
} from 'firebase/firestore';

// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyDQS3AvNuYk7t1FLg5wVZFNyVj5Yu00A04",
  authDomain: "localservicehub-15249.firebaseapp.com",
  projectId: "localservicehub-15249",
  storageBucket: "localservicehub-15249.firebasestorage.app",
  messagingSenderId: "249409614337",
  appId: "1:249409614337:web:ef0850b7ec714e79d8c600",
};

// =====================================================
// FIREBASE APP
// =====================================================

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

// =====================================================
// FIREBASE AUTH
// =====================================================

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(
      AsyncStorage
    ),
  });
} catch (error) {
  if (error?.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

// =====================================================
// FIRESTORE
// =====================================================

const db = getFirestore(app);

// =====================================================
// EXPORT
// =====================================================

export {
  auth,
  db,
};