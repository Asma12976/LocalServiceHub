// src/screens/admin/AdminProviderDetailsScreen.js
// Full detail view of one provider, opened from AdminProvidersScreen.
// Shows the whole business profile plus, since this admin session already
// has every booking loaded (AdminContext), a quick view of any disputes
// or reviews tied to this specific provider — so an admin deciding
// whether to suspend someone doesn't have to jump between three screens.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useProvider } from '../../context/ProviderContext';
import { useAdmin } from '../../context/AdminContext';
import { categories } from '../../data/mockData';
import { formatRelativeTime } from '../../utils/dateFormat';
import { pushNotification } from '../../utils/notify';

const STATUS_META = {
  approved: { label: 'Approved', color: '#16A34A' },
  pending: { label: 'Pending Review', color: '#D97706' },
  suspended: { label: 'Suspended', color: '#DC2626' },
  removed: { label: 'Removed', color: '#6B7280' },
};

export default function AdminProviderDetailsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { provider: providerParam } = route.params || {};
  const {
    approveProvider,
    suspendProvider,
    reactivateProvider,
    removeProviderListing,
    flagProvider,
    unflagProvider,
    allProvidersRaw,
    liveStatsById,
  } = useProvider();
  // notifyPartyViaChat lets suspend/flag deliver a real, reply-able chat
  // message alongside the one-way push notification below — same
  // mechanism resolveDispute/dismissDispute already use in AdminContext.
  const { disputes, reviews, notifyPartyViaChat } = useAdmin();

  const [busy, setBusy] = useState(false);
  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [flagReasonInput, setFlagReasonInput] = useState('');

  // Always prefer the live copy of this provider from the Firestore
  // listener (allProvidersRaw) over the snapshot passed in via navigation
  // params, so approve/suspend from elsewhere, a profile edit, or a rating
  // change shows up on this screen immediately without needing to go back
  // and reopen it. Falls back to the navigation param only for the one
  // instant right after navigating, before the listener's first snapshot
  // has this id yet.
  const liveProvider = allProvidersRaw.find((p) => p.id === providerParam?.id);
  const baseProvider = liveProvider || providerParam;
  const liveStats = baseProvider ? liveStatsById[baseProvider.id] : null;
  const provider = baseProvider
    ? {
        ...baseProvider,
        rating: liveStats ? liveStats.rating : baseProvider.rating,
        reviews: liveStats ? liveStats.reviews : baseProvider.reviews,
      }
    : null;

  if (!provider) {
    return (
      <View style={styles.missingScreen}>
        <Text style={styles.missingText}>Provider not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.missingBtn}>
          <Text style={styles.missingBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusMeta = STATUS_META[provider.status] || STATUS_META.approved;
  const categoryName = categories.find((c) => c.id === provider.categoryId)?.name || 'Uncategorized';

  const providerDisputes = disputes.filter((b) => b.provider?.id === provider.id);
  const providerReviews = reviews.filter((b) => b.provider?.id === provider.id).slice(0, 5);

  const notifyProvider = (title, body) => {
    if (!provider.ownerUid) return;
    pushNotification({ toUid: provider.ownerUid, type: 'account', title, body, data: { target: 'provider' } });
  };

  // See the matching comment in AdminProvidersScreen.js — this sends the
  // same text as a genuine chat message so the provider can reply and
  // actually talk it through with support, not just read a one-way alert.
  const notifyProviderChat = (body) => {
    notifyPartyViaChat(provider.ownerUid, provider.name || 'Provider', provider.image || '', body);
  };

  const handleApprove = async () => {
    setBusy(true);
    try {
      await approveProvider(provider.id);
      notifyProvider('Listing Approved', 'Your business profile has been approved and is now live.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not approve this provider.');
    } finally {
      setBusy(false);
    }
  };

  const handleReactivate = async () => {
    setBusy(true);
    try {
      await reactivateProvider(provider.id);
      notifyProvider('Listing Reactivated', 'Your business profile is active again.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not reactivate this provider.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmSuspend = async () => {
    setBusy(true);
    try {
      await suspendProvider(provider.id, suspendReason.trim());
      const reason = suspendReason.trim();
      notifyProvider(
        'Listing Suspended',
        reason
          ? `Your business profile has been suspended: ${reason}`
          : 'Your business profile has been suspended by Local Service Hub admin.'
      );
      notifyProviderChat(
        `Your business profile "${provider.name}" has been suspended${reason ? `: ${reason}` : '.'}\n\nReply here to talk it through with our support team and get your account sorted out.`
      );
      setSuspendModalVisible(false);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not suspend this provider.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmFlag = async () => {
    setBusy(true);
    try {
      await flagProvider(provider.id, flagReasonInput.trim());
      const reason = flagReasonInput.trim();
      notifyProvider(
        'Listing Flagged For Review',
        reason
          ? `Your business profile has been flagged for review: ${reason}`
          : 'Your business profile has been flagged for review by Local Service Hub admin.'
      );
      notifyProviderChat(
        `Your business profile "${provider.name}" has been flagged for review${reason ? `: ${reason}` : '.'}\n\nYour listing is still live — reply here if you'd like to sort this out with support before it goes any further.`
      );
      setFlagModalVisible(false);
      setFlagReasonInput('');
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not flag this provider.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnflag = async () => {
    setBusy(true);
    try {
      await unflagProvider(provider.id);
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not clear this flag.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Listing',
      `Permanently remove ${provider.name} from Local Service Hub? This cannot be undone from here.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await removeProviderListing(provider.id);
              notifyProvider('Listing Removed', 'Your business profile has been removed from Local Service Hub.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Failed', err?.message || 'Could not remove this provider.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

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
            <Text style={styles.headerTitle}>Provider Details</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.profileCard}>
          <Image source={{ uri: provider.image }} style={styles.avatar} />
          <Text style={styles.name}>{provider.name}</Text>
          <Text style={styles.category}>{categoryName}</Text>

          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusMeta.color}1A` }]}>
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
            {provider.flagged ? (
              <View style={[styles.statusBadge, { backgroundColor: colors.errorBg, marginLeft: 8 }]}>
                <Ionicons name="flag" size={11} color={colors.error} />
                <Text style={[styles.statusBadgeText, { color: colors.error, marginLeft: 4 }]}>Flagged</Text>
              </View>
            ) : null}
          </View>

          {provider.status === 'suspended' && provider.suspendReason ? (
            <Text style={styles.suspendReason}>Reason: {provider.suspendReason}</Text>
          ) : null}
          {provider.flagged && provider.flagReason ? (
            <Text style={styles.suspendReason}>Flag reason: {provider.flagReason}</Text>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <StatBox styles={styles} label="Rating" value={`${provider.rating} ★`} />
          <StatBox styles={styles} label="Reviews" value={provider.reviews} />
          <StatBox styles={styles} label="Experience" value={`${provider.experienceYears} yrs`} />
        </View>

        <Section title="Contact & Location" styles={styles}>
          <InfoRow icon="call-outline" label={provider.phone || 'Not provided'} colors={colors} styles={styles} />
          <InfoRow icon="location-outline" label={provider.location || 'Not provided'} colors={colors} styles={styles} />
        </Section>

        <Section title="About" styles={styles}>
          <Text style={styles.aboutText}>{provider.about || 'No description provided.'}</Text>
        </Section>

        <Section title={`Services (${provider.services?.length || 0})`} styles={styles}>
          {(provider.services || []).map((s) => (
            <View key={s.id} style={styles.serviceRow}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.servicePrice}>Rs. {s.price}</Text>
            </View>
          ))}
        </Section>

        {providerDisputes.length > 0 ? (
          <Section title={`Disputes (${providerDisputes.length})`} styles={styles}>
            {providerDisputes.slice(0, 5).map((b) => (
              <View key={b.id} style={styles.miniRow}>
                <Ionicons
                  name={b.dispute.status === 'open' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                  size={15}
                  color={b.dispute.status === 'open' ? colors.error : colors.success}
                />
                <Text style={styles.miniRowText} numberOfLines={1}>{b.dispute.reason}</Text>
                <Text style={styles.miniRowTime}>{formatRelativeTime(b.dispute.createdAt)}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {providerReviews.length > 0 ? (
          <Section title="Recent Reviews" styles={styles}>
            {providerReviews.map((b) => (
              <View key={b.id} style={styles.miniRow}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.miniRowText} numberOfLines={1}>
                  {b.review.rating}/5 — {b.review.comment || 'No comment'}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {provider.status === 'pending' ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleApprove} disabled={busy}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
            <Text style={styles.primaryBtnText}>Approve Listing</Text>
          </TouchableOpacity>
        ) : null}

        {provider.status === 'approved' ? (
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => setSuspendModalVisible(true)}
            disabled={busy}
          >
            <Ionicons name="ban-outline" size={16} color={colors.error} />
            <Text style={styles.dangerBtnText}>Suspend</Text>
          </TouchableOpacity>
        ) : null}

        {provider.status === 'suspended' ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleReactivate} disabled={busy}>
            <Ionicons name="refresh" size={16} color={colors.white} />
            <Text style={styles.primaryBtnText}>Reactivate</Text>
          </TouchableOpacity>
        ) : null}

        {provider.status !== 'removed' ? (
          provider.flagged ? (
            <TouchableOpacity style={styles.removeBtn} onPress={handleUnflag} disabled={busy}>
              <Ionicons name="flag" size={16} color={colors.error} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => setFlagModalVisible(true)}
              disabled={busy}
            >
              <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )
        ) : null}

        {provider.status !== 'removed' ? (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove} disabled={busy}>
            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={suspendModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setSuspendModalVisible(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
          pointerEvents="box-none"
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Suspend {provider.name}</Text>
            <TextInput
              style={styles.modalInput}
              value={suspendReason}
              onChangeText={setSuspendReason}
              placeholder="Reason (shown to the provider)"
              placeholderTextColor={colors.placeholder}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSuspendModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmSuspend} disabled={busy}>
                <Text style={styles.modalConfirmText}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={flagModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setFlagModalVisible(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
          pointerEvents="box-none"
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Flag {provider.name}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6, lineHeight: 17 }}>
              Their listing stays live — this just marks it for a closer look. Give a reason (shown to them, and they can reply).
            </Text>
            <TextInput
              style={styles.modalInput}
              value={flagReasonInput}
              onChangeText={setFlagReasonInput}
              placeholder="Reason (shown to the provider)"
              placeholderTextColor={colors.placeholder}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setFlagModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirmFlag} disabled={busy}>
                <Text style={styles.modalConfirmText}>Flag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatBox({ styles, label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children, styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, colors, styles }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <Text style={styles.infoRowText}>{label}</Text>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    missingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    missingText: { color: colors.textSecondary, marginBottom: spacing.md },
    missingBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.md },
    missingBtnText: { color: colors.white, fontWeight: '700' },

    header: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
    headerGradient: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    circleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: colors.white },

    profileCard: { alignItems: 'center', marginTop: spacing.sm },
    avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: colors.surface },
    name: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.sm },
    category: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
    statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
    statusBadgeText: { fontSize: 11.5, fontWeight: '800' },
    suspendReason: { fontSize: 12, color: colors.error, marginTop: 6, textAlign: 'center', paddingHorizontal: spacing.lg },

    statsRow: { flexDirection: 'row', marginTop: spacing.lg },
    statBox: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm + 4, marginHorizontal: 4 },
    statValue: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

    section: { marginTop: spacing.lg },
    sectionTitle: { fontSize: 13.5, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm },
    sectionCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },

    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    infoRowText: { fontSize: 13, color: colors.textPrimary, marginLeft: 8 },

    aboutText: { fontSize: 13, lineHeight: 19, color: colors.textPrimary },

    serviceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    serviceName: { fontSize: 13, color: colors.textPrimary, flex: 1 },
    servicePrice: { fontSize: 13, fontWeight: '700', color: colors.accentGradientEnd },

    miniRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    miniRowText: { fontSize: 12.5, color: colors.textPrimary, marginLeft: 8, flex: 1 },
    miniRowTime: { fontSize: 10.5, color: colors.textSecondary, marginLeft: 6 },

    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm + 2,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      shadowColor: colors.navy,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
      elevation: 14,
    },
    primaryBtn: { flex: 1, flexDirection: 'row', height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
    primaryBtnText: { color: colors.white, fontWeight: '800', fontSize: 13.5, marginLeft: 6 },
    dangerBtn: { flex: 1, flexDirection: 'row', height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.error },
    dangerBtnText: { color: colors.error, fontWeight: '800', fontSize: 13.5, marginLeft: 6 },
    removeBtn: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, marginLeft: spacing.sm },

    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
    modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
    modalTitle: { fontSize: 15.5, fontWeight: '800', color: colors.textPrimary },
    modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, color: colors.textPrimary, fontSize: 13, padding: spacing.sm + 4, minHeight: 70, marginTop: spacing.md, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md },
    modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 6 },
    modalCancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
    modalConfirmBtn: { backgroundColor: colors.error, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 10 },
    modalConfirmText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  });
}