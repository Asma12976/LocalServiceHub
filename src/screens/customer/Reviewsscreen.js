// src/screens/customer/ReviewsScreen.js
// "My Reviews" — completed bookings that still need a rating show an inline
// "Rate this service" card (spec section 18); once submitted, the review
// moves into the "My Reviews" list below. Backed by BookingsContext, so a
// review submitted here is the same data BookingDetailsScreen would show.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useBookings } from '../../context/BookingsContext';

export default function ReviewsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { completedBookings, submitReview } = useBookings();

  const pendingReview = useMemo(
    () => completedBookings.filter((b) => !b.review),
    [completedBookings]
  );
  const reviewed = useMemo(
    () => completedBookings.filter((b) => b.review),
    [completedBookings]
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <LinearGradient
          colors={[colors.navy, colors.navySoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn}>
              <Ionicons name="arrow-back" size={20} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Reviews</Text>
            <View style={styles.circleBtnSpacer} />
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      >
        {pendingReview.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Rate Your Recent Service</Text>
            {pendingReview.map((booking) => (
              <PendingReviewCard colors={colors} styles={styles} key={booking.id} booking={booking} onSubmit={submitReview} />
            ))}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Reviews You've Given</Text>
        {reviewed.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={36} color={colors.placeholder} />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySubtitle}>
              Once you complete a service, you can rate it here.
            </Text>
          </View>
        ) : (
          reviewed.map((booking) => (
            <View key={booking.id} style={styles.reviewCard}>
              <View style={styles.reviewHeaderRow}>
                <Image source={{ uri: booking.provider.image }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.providerName}>{booking.provider.name}</Text>
                  <Text style={styles.serviceName}>{booking.service.name}</Text>
                </View>
                <StarRow rating={booking.review.rating} size={13} />
              </View>
              {booking.review.comment ? (
                <Text style={styles.reviewComment}>{booking.review.comment}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PendingReviewCard({ booking, onSubmit, colors, styles}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit(booking.id, rating, comment.trim());
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={[styles.pendingCard, styles.pendingCardDone]}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={styles.pendingDoneText}>Thanks for rating {booking.provider.name}!</Text>
      </View>
    );
  }

  return (
    <View style={styles.pendingCard}>
      <View style={styles.reviewHeaderRow}>
        <Image source={{ uri: booking.provider.image }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.providerName}>{booking.provider.name}</Text>
          <Text style={styles.serviceName}>{booking.service.name}</Text>
        </View>
      </View>

      <Text style={styles.howWasIt}>How was your experience?</Text>
      <StarRow rating={rating} size={26} onSelect={setRating} interactive />

      <TextInput
        style={styles.commentInput}
        value={comment}
        onChangeText={setComment}
        placeholder="Write a comment (optional)"
        placeholderTextColor={colors.placeholder}
        multiline
      />

      <TouchableOpacity
        style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={rating === 0}
        activeOpacity={0.85}
      >
        <Text style={styles.submitBtnText}>Submit Review</Text>
      </TouchableOpacity>
    </View>
  );
}

function StarRow({ rating, size = 16, onSelect, interactive = false }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity
          key={i}
          disabled={!interactive}
          onPress={() => onSelect && onSelect(i)}
          hitSlop={4}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={size}
            color="#F59E0B"
            style={{ marginRight: 2 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },

  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: spacing.sm,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  serviceName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  pendingCard: {
    backgroundColor: 'rgba(31, 78, 121, 0.06)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(31, 78, 121, 0.16)',
  },
  pendingCardDone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 118, 88, 0.08)',
    borderColor: 'rgba(62, 118, 88, 0.2)',
  },
  pendingDoneText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.success,
    marginLeft: 8,
  },
  howWasIt: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  commentInput: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 60,
  },
  submitBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },

  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewComment: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.lg,
  },
});
}