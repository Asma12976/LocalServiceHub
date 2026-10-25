// src/context/FavoritesContext.js
// App-wide favorites store. Wrapped around the app in App.js so any screen
// can save a provider, check if it's saved, or read the full saved list —
// no prop drilling needed.
//
// Backed by Firestore now — same pattern as BookingsContext: a top-level
// "favorites" collection, one doc per (customer, provider) pair, queried
// with where('customerId', '==', uid) and kept in sync with a live
// onSnapshot listener. The doc id is deterministic (`${uid}_${providerId}`)
// so toggling a favorite is just a setDoc/deleteDoc on that one doc instead
// of needing to look up an existing doc id first. Writes are applied to
// local state immediately (optimistic update) so isFavorite()/favorites
// reflect a tap instantly, the same way the old in-memory version did,
// while the listener keeps everything correct in the background.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';

import { db } from '../config/firebase';
import { useUser } from './UserContext';

const FavoritesContext = createContext(undefined);

const FAVORITES_COLLECTION = 'favorites';

function favoriteDocId(uid, providerId) {
  return `${uid}_${providerId}`;
}

export function FavoritesProvider({ children }) {
  const { user } = useUser();
  const uid = user?.uid;

  const [favoritesMap, setFavoritesMap] = useState({}); // { [providerId]: provider }

  // -------------------------------------------------------------------
  // Live sync: whenever the logged-in customer changes (login/logout),
  // subscribe to that customer's saved favorites and keep local state
  // mirrored — same shape (providerId -> full provider snapshot) the rest
  // of the app already expects.
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!uid) {
      setFavoritesMap({});
      return;
    }

    const favoritesQuery = query(
      collection(db, FAVORITES_COLLECTION),
      where('customerId', '==', uid)
    );

    const unsubscribe = onSnapshot(
      favoritesQuery,
      (snapshot) => {
        const next = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data?.providerId && data?.provider) {
            next[data.providerId] = data.provider;
          }
        });
        setFavoritesMap(next);
      },
      (err) => {
        console.log('Favorites listener error:', err?.message);
      }
    );

    return unsubscribe;
  }, [uid]);

  const toggleFavorite = useCallback(
    (provider) => {
      if (!provider?.id || !uid) return;

      const ref = doc(db, FAVORITES_COLLECTION, favoriteDocId(uid, provider.id));
      const isCurrentlyFavorite = Boolean(favoritesMap[provider.id]);

      setFavoritesMap((prev) => {
        const next = { ...prev };
        if (isCurrentlyFavorite) {
          delete next[provider.id];
        } else {
          next[provider.id] = provider;
        }
        return next;
      });

      if (isCurrentlyFavorite) {
        deleteDoc(ref).catch((err) =>
          console.log('toggleFavorite failed to remove from Firestore:', err?.message)
        );
      } else {
        setDoc(ref, {
          customerId: uid,
          providerId: provider.id,
          provider,
          createdAt: new Date().toISOString(),
        }).catch((err) =>
          console.log('toggleFavorite failed to save to Firestore:', err?.message)
        );
      }
    },
    [uid, favoritesMap]
  );

  const isFavorite = useCallback(
    (providerId) => Boolean(favoritesMap[providerId]),
    [favoritesMap]
  );

  const favorites = useMemo(() => Object.values(favoritesMap), [favoritesMap]);

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite }),
    [favorites, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used inside a <FavoritesProvider>');
  }
  return ctx;
}