// src/components/ProviderCard.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function ProviderCard({ provider, onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={styles.card}>
      <View style={styles.avatarWrap}>
        <Image source={{ uri: provider.image }} style={styles.avatar} resizeMode="cover" />

        {/* Floating rating badge, overlapping the bottom-right of the avatar */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={11} color="#F59E0B" />
          <Text style={styles.ratingBadgeText}>{provider.rating}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {provider.name}
          </Text>
          {provider.available ? (
            <View style={styles.availablePill}>
              <View style={styles.availableDot} />
              <Text style={styles.availablePillText}>Available</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.reviewsText}>{provider.reviews} reviews</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.metaChipText} numberOfLines={1}>{provider.location || 'Location N/A'}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.priceText}>Rs. {provider.startingPrice}+</Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatarWrap: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -20,
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
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 2,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
    marginRight: 6,
  },
  availablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  availablePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  reviewsText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    flexShrink: 1,
  },
  metaChipText: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
    flexShrink: 1,
  },
  priceText: {
    fontSize: 11.5,
    color: colors.accentGradientEnd,
    fontWeight: '800',
  },
});
}