// src/components/ProviderGridCard.js
// Vertical card used by the Explore screen's 2-column grid view (as opposed
// to ProviderCard, which is the full-width row used by the list view).
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function ProviderGridCard({ provider, onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.card}>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: provider.image }} style={styles.thumb} resizeMode="cover" />

        {provider.available ? (
          <View style={styles.availableDotWrap}>
            <View style={styles.availableDot} />
          </View>
        ) : null}

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={10} color="#F59E0B" />
          <Text style={styles.ratingBadgeText}>{provider.rating}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {provider.name}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{provider.location || 'Location N/A'}</Text>
        </View>

        <Text style={styles.price}>Rs. {provider.startingPrice}+</Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  thumbWrap: {
    height: 96,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  availableDotWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.pill,
    padding: 3,
  },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    shadowColor: colors.navy,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ratingBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 2,
  },
  info: {
    padding: spacing.sm + 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 3,
    flexShrink: 1,
  },
  price: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.accentGradientEnd,
    marginTop: 6,
  },
});
}