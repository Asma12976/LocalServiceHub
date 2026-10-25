// src/screens/customer/ProviderReviewsScreen.js
// "See All" reviews for one specific provider — opened from
// ProviderDetailsScreen's rating row / Reviews section. This is different
// from ReviewsScreen ("My Reviews", the customer's own reviews-given list)
// AND from provider/ProviderMyReviewsScreen (the logged-in *provider's*
// own reviews, with no route param — wrong screen to open here since it
// would show whoever is currently logged in, not the provider being
// viewed). This screen shows every review *that provider* has received
// from any customer, pulled straight from the top-level "bookings"
// collection so it always reflects the same numbers as the provider's
// rating/reviews count (see BookingsContext.submitReview).
//
// Tapping a review opens the same "full details" bottom sheet that
// provider/ProviderMyReviewsScreen shows the provider — job date/time,
// address, notes, and any photo the customer attached — just scoped to
// this specific provider instead of the logged-in user.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../config/firebase';
import { formatRelativeTime } from '../../utils/dateFormat';

export default function ProviderReviewsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { provider } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!provider?.id) {
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'bookings'), where('provider.id', '==', provider.id));
        const snap = await getDocs(q);

        const docs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((b) => b.review)
          .sort((a, b) => new Date(b.review.createdAt) - new Date(a.review.createdAt));

        // The reviewer's name/photo may be missing or stale on the booking
        // itself — older bookings/reviews were saved before reviewerName
        // existed, and the "customer" field is only ever a snapshot taken
        // when the booking was made. Same fix as ProviderMyReviewsScreen:
        // look up each reviewer's *current* profile from "users" (keyed by
        // the always-present customerId) and prefer that live name/photo,
        // so a reviewer's real name shows here instead of falling through
        // to a generic "Customer".
        const uniqueCustomerIds = Array.from(
          new Set(docs.map((b) => b.customerId || b.customer?.id).filter(Boolean))
        );

        const profileEntries = await Promise.all(
          uniqueCustomerIds.map(async (customerId) => {
            try {
              const userSnap = await getDoc(doc(db, 'users', customerId));
              if (!userSnap.exists()) return [customerId, null];
              const data = userSnap.data();
              return [
                customerId,
                { name: data.name || '', photo: data.photoURL || '' },
              ];
            } catch (err) {
              console.log('Could not load reviewer profile:', err?.message);
              return [customerId, null];
            }
          })
        );
        const liveProfiles = Object.fromEntries(profileEntries);

        const enriched = docs.map((booking) => {
          const customerId = booking.customerId || booking.customer?.id;
          const liveProfile = customerId ? liveProfiles[customerId] : null;

          return {
            ...booking,
            customer: {
              ...booking.customer,
              name:
                booking.review?.reviewerName ||
                liveProfile?.name ||
                booking.customer?.name ||
                'Customer',
              photo:
                booking.review?.reviewerPhoto ||
                liveProfile?.photo ||
                booking.customer?.photo ||
                '',
            },
          };
        });

        if (!cancelled) setReviews(enriched);
      } catch (err) {
        console.log('Could not load provider reviews:', err?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };

  }, [provider?.id]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return provider?.rating || 0;
    const sum = reviews.reduce((acc, b) => acc + (b.review?.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews, provider?.rating]);

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
            <Text style={styles.headerTitle} numberOfLines={1}>
              {provider?.name ? `${provider.name} — Reviews` : 'Reviews'}
            </Text>
            <View style={styles.circleBtnSpacer} />
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryScore}>{averageRating || 0}</Text>
            <View>
              <View style={{ flexDirection: 'row' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= Math.round(averageRating) ? 'star' : 'star-outline'}
                    size={13}
                    color="#F59E0B"
                  />
                ))}
              </View>
              <Text style={styles.summaryCount}>{reviews.length} reviews</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            reviews.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ReviewCard colors={colors} styles={styles} booking={item} onPress={() => setSelectedReview(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={36} color={colors.placeholder} />
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptyText}>
                Once customers rate a completed job, their reviews will show up here.
              </Text>
            </View>
          }
        />
      )}

      <ReviewDetailModal colors={colors} styles={styles}
        booking={selectedReview}
        onClose={() => setSelectedReview(null)}
        insets={insets}
      />
    </View>
  );
}

function ReviewCard({ booking, onPress, colors, styles}) {
  const customerName = booking.customer?.name || 'Customer';

  return (
    <TouchableOpacity style={styles.reviewCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.reviewHeaderRow}>
        {booking.customer?.photo ? (
          <Image source={{ uri: booking.customer.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={16} color={colors.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
          <Text style={styles.serviceName} numberOfLines={1}>{booking.service?.name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= booking.review.rating ? 'star' : 'star-outline'}
                size={12}
                color="#F59E0B"
              />
            ))}
          </View>
          <Text style={styles.reviewTime}>{formatRelativeTime(booking.review.createdAt)}</Text>
        </View>
      </View>

      {booking.review.comment ? (
        <Text style={styles.reviewComment} numberOfLines={2}>{booking.review.comment}</Text>
      ) : null}

      <View style={styles.tapHintRow}>
        <Text style={styles.tapHintText}>View full details</Text>
        <Ionicons name="chevron-forward" size={13} color={colors.accent} />
      </View>
    </TouchableOpacity>
  );
}

function ReviewDetailModal({ booking, onClose, insets, colors, styles}) {
  const visible = !!booking;
  const customerName = booking?.customer?.name || 'Customer';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.modalHandle} />

          {booking ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.md }}>
              <View style={styles.modalHeaderRow}>
                {booking.customer?.photo ? (
                  <Image source={{ uri: booking.customer.photo }} style={styles.modalAvatar} />
                ) : (
                  <View style={[styles.modalAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={22} color={colors.textSecondary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCustomerName}>{customerName}</Text>
                  <Text style={styles.modalServiceName}>{booking.service?.name}</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalRatingRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={i <= booking.review.rating ? 'star' : 'star-outline'}
                    size={18}
                    color="#F59E0B"
                    style={{ marginRight: 2 }}
                  />
                ))}
                <Text style={styles.modalRatingText}>{booking.review.rating} / 5</Text>
                <Text style={styles.modalRatingTime}> · {formatRelativeTime(booking.review.createdAt)}</Text>
              </View>

              {booking.review.comment ? (
                <View style={styles.modalCommentBox}>
                  <Text style={styles.modalCommentText}>{booking.review.comment}</Text>
                </View>
              ) : (
                <Text style={styles.modalNoComment}>No written comment left with this review.</Text>
              )}

              <Text style={styles.modalSectionTitle}>Job Details</Text>
              <View style={styles.modalDetailsCard}>
                <DetailRow colors={colors} styles={styles} icon="calendar-outline" label="Date" value={booking.dateLabel} />
                <DetailRow colors={colors} styles={styles} icon="time-outline" label="Time" value={booking.timeSlot} />
                <DetailRow colors={colors} styles={styles} icon="location-outline" label="Address" value={booking.address} />
                {booking.problemDescription ? (
                  <DetailRow colors={colors} styles={styles} icon="document-text-outline" label="Notes" value={booking.problemDescription} />
                ) : null}
              </View>

              {booking.imageUrl ? (
                <>
                  <Text style={styles.modalSectionTitle}>Photo the customer attached</Text>
                  <Image source={{ uri: booking.imageUrl }} style={styles.modalJobImage} resizeMode="cover" />
                </>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, value, colors, styles}) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} style={{ marginTop: 1 }} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
    marginHorizontal: spacing.sm,
    textAlign: 'center',
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  summaryScore: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.white,
    marginRight: spacing.sm,
  },
  summaryCount: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: {
    padding: spacing.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm + 2,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: spacing.sm,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  serviceName: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reviewTime: {
    fontSize: 10,
    color: colors.placeholder,
    marginTop: 3,
  },
  reviewComment: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  tapHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    marginRight: 2,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  // Detail modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '85%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  modalCustomerName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalServiceName: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalRatingText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  modalRatingTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  modalCommentBox: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  modalCommentText: {
    fontSize: 13.5,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  modalNoComment: {
    fontSize: 12.5,
    color: colors.placeholder,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },

  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalDetailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm + 2,
  },
  detailLabel: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginLeft: 8,
    width: 62,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalJobImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
  },
});
}