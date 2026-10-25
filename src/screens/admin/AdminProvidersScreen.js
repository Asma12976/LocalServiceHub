// src/screens/admin/AdminProvidersScreen.js
// "Providers" tab of the Admin Panel — every real provider on the
// platform (mock listings are never shown here, there's nothing to
// moderate about them), with search, a status filter, and moderation
// actions. Opened either from the tab bar (no filter) or from
// AdminDashboardScreen's stat cards, which pass a `statusFilter` param
// to land directly on Pending/Approved/Suspended.
//
// Moderation itself (approve/suspend/reactivate/remove/flag) is handled by
// ProviderContext — this screen is just the UI on top of those actions.
// Suspending or flagging also notifies the affected provider two ways: a
// push notification (so they see it in Notifications) AND a real chat
// message via AdminContext.notifyPartyViaChat, so they can actually reply
// and get it sorted out with support instead of just being told about it.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
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
import { pushNotification } from '../../utils/notify';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'removed', label: 'Removed' },
];

const STATUS_META = {
  approved: { label: 'Approved', color: '#16A34A' },
  pending: { label: 'Pending', color: '#D97706' },
  suspended: { label: 'Suspended', color: '#DC2626' },
  removed: { label: 'Removed', color: '#6B7280' },
};

function categoryName(categoryId) {
  return categories.find((c) => c.id === categoryId)?.name || 'Uncategorized';
}

export default function AdminProvidersScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const {
    allProvidersRaw,
    loadingAllProviders,
    approveProvider,
    suspendProvider,
    reactivateProvider,
    flagProvider,
    unflagProvider,
    // Live rating/review-count aggregate, computed straight from reviewed
    // bookings (see the big comment on this in ProviderContext.js). The
    // "rating"/"reviews" fields stored on the provider doc itself can go
    // stale (write blocked by Firestore rules), so this list always
    // prefers liveStatsById over item.rating/item.reviews when it has a
    // number for that provider — that's what keeps this list in sync the
    // moment a new review comes in, with no refresh needed.
    liveStatsById,
  } = useProvider();

  // Used to also deliver the suspend/flag notice as a real, reply-able
  // chat message (see notifyProviderChat below) — the exact same
  // mechanism AdminContext.resolveDispute/dismissDispute already use for
  // disputes, just called from here for provider moderation instead.
  const { notifyPartyViaChat } = useAdmin();

  const [filter, setFilter] = useState(route.params?.statusFilter || 'all');
  const [search, setSearch] = useState('');

  // Suspend needs a reason — small inline modal rather than a whole
  // separate screen, since it's just one text field.
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  // Same idea for flagging — a lighter-weight "keep an eye on this one"
  // than suspend, also with a reason shown to the provider (see
  // ProviderContext.flagProvider).
  const [flagTarget, setFlagTarget] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [actioningId, setActioningId] = useState(null);

  const filtered = useMemo(() => {
    let list = allProvidersRaw;

    if (filter === 'flagged') {
      list = list.filter((p) => p.flagged);
    } else if (filter !== 'all') {
      list = list.filter((p) => p.status === filter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          categoryName(p.categoryId).toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [allProvidersRaw, filter, search]);

  const notifyProvider = (provider, title, body) => {
    if (!provider?.ownerUid) return;
    pushNotification({
      toUid: provider.ownerUid,
      type: 'account',
      title,
      body,
      data: { target: 'provider' },
    });
  };

  // pushNotification (above) is a one-way heads-up — fine for "you were
  // approved", but for suspend/flag the provider needs to actually be
  // able to respond and sort it out, not just be told about it. Sends
  // the exact same text as a real chat message too, in the same
  // conversation used everywhere else (see AdminContext.notifyPartyViaChat),
  // so replying is just "open the notification/message like any other
  // chat" — no separate "contact support" flow needed.
  const notifyProviderChat = (provider, body) => {
    notifyPartyViaChat(provider?.ownerUid, provider?.name || 'Provider', provider?.image || '', body);
  };

  const handleApprove = async (provider) => {
    setActioningId(provider.id);
    try {
      await approveProvider(provider.id);
      notifyProvider(
        provider,
        'Listing Approved',
        'Your business profile has been approved and is now live on Local Service Hub.'
      );
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not approve this provider.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReactivate = async (provider) => {
    setActioningId(provider.id);
    try {
      await reactivateProvider(provider.id);
      notifyProvider(
        provider,
        'Listing Reactivated',
        'Your business profile is active again on Local Service Hub.'
      );
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not reactivate this provider.');
    } finally {
      setActioningId(null);
    }
  };

  const openSuspendModal = (provider) => {
    setSuspendTarget(provider);
    setSuspendReason('');
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTarget) return;
    setActioningId(suspendTarget.id);
    try {
      await suspendProvider(suspendTarget.id, suspendReason.trim());
      const reason = suspendReason.trim();
      notifyProvider(
        suspendTarget,
        'Listing Suspended',
        reason
          ? `Your business profile has been suspended: ${reason}`
          : 'Your business profile has been suspended by Local Service Hub admin.'
      );
      notifyProviderChat(
        suspendTarget,
        `Your business profile "${suspendTarget.name}" has been suspended${reason ? `: ${reason}` : '.'}\n\nReply here to talk it through with our support team and get your account sorted out.`
      );
      setSuspendTarget(null);
      setSuspendReason('');
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not suspend this provider.');
    } finally {
      setActioningId(null);
    }
  };

  const openFlagModal = (provider) => {
    setFlagTarget(provider);
    setFlagReason('');
  };

  const handleConfirmFlag = async () => {
    if (!flagTarget) return;
    setActioningId(flagTarget.id);
    try {
      await flagProvider(flagTarget.id, flagReason.trim());
      const reason = flagReason.trim();
      notifyProvider(
        flagTarget,
        'Listing Flagged For Review',
        reason
          ? `Your business profile has been flagged for review: ${reason}`
          : 'Your business profile has been flagged for review by Local Service Hub admin.'
      );
      notifyProviderChat(
        flagTarget,
        `Your business profile "${flagTarget.name}" has been flagged for review${reason ? `: ${reason}` : '.'}\n\nYour listing is still live — reply here if you'd like to sort this out with support before it goes any further.`
      );
      setFlagTarget(null);
      setFlagReason('');
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not flag this provider.');
    } finally {
      setActioningId(null);
    }
  };

  const handleUnflag = async (provider) => {
    setActioningId(provider.id);
    try {
      await unflagProvider(provider.id);
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not clear this flag.');
    } finally {
      setActioningId(null);
    }
  };

  const renderItem = ({ item }) => {
    const statusMeta = STATUS_META[item.status] || STATUS_META.approved;
    const liveStats = liveStatsById[item.id];
    const displayRating = liveStats ? liveStats.rating : item.rating;
    const displayReviews = liveStats ? liveStats.reviews : item.reviews;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AdminProviderDetails', { provider: item })}
      >
        <Image source={{ uri: item.image }} style={styles.avatar} />

        <View style={{ flex: 1, marginLeft: spacing.sm + 2 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusMeta.color}1A` }]}>
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>
            {item.flagged ? (
              <View style={styles.flagBadge}>
                <Ionicons name="flag" size={9} color={colors.error} />
              </View>
            ) : null}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {categoryName(item.categoryId)} · {item.location || 'No location set'}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={styles.metaSmall}>{displayRating} ({displayReviews})</Text>
          </View>
        </View>

        <View style={styles.actionsCol}>
          {item.status === 'pending' ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: 'rgba(22,163,74,0.12)' }]}
              onPress={() => handleApprove(item)}
              disabled={actioningId === item.id}
            >
              <Ionicons name="checkmark" size={16} color="#16A34A" />
            </TouchableOpacity>
          ) : null}

          {item.status === 'approved' ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.errorBg }]}
              onPress={() => openSuspendModal(item)}
              disabled={actioningId === item.id}
            >
              <Ionicons name="ban-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          ) : null}

          {item.status === 'suspended' ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: 'rgba(22,163,74,0.12)' }]}
              onPress={() => handleReactivate(item)}
              disabled={actioningId === item.id}
            >
              <Ionicons name="refresh" size={16} color="#16A34A" />
            </TouchableOpacity>
          ) : null}

          {item.status !== 'removed' ? (
            item.flagged ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => handleUnflag(item)}
                disabled={actioningId === item.id}
              >
                <Ionicons name="flag" size={16} color={colors.error} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => openFlagModal(item)}
                disabled={actioningId === item.id}
              >
                <Ionicons name="flag-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )
          ) : null}
        </View>
      </TouchableOpacity>
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
          style={[styles.headerGradient, { paddingTop: insets.top + 14 }]}
        >
          <Text style={styles.headerTitle}>Providers</Text>
          <Text style={styles.headerSubtitle}>{filtered.length} of {allProvidersRaw.length} listings</Text>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, category, area..."
              placeholderTextColor="rgba(255,255,255,0.55)"
            />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.filterRow}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f.key}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(item.key)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          !loadingAllProviders ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={28} color={colors.placeholder} />
              <Text style={styles.emptyText}>No providers match this filter.</Text>
            </View>
          ) : null
        }
      />

      {/* Suspend reason modal */}
      <Modal visible={!!suspendTarget} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setSuspendTarget(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
          pointerEvents="box-none"
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Suspend {suspendTarget?.name}</Text>
            <Text style={styles.modalSubtitle}>
              This provider will be hidden from customers immediately. Give a reason (shown to them).
            </Text>
            <TextInput
              style={styles.modalInput}
              value={suspendReason}
              onChangeText={setSuspendReason}
              placeholder="e.g. Multiple unresolved disputes"
              placeholderTextColor={colors.placeholder}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSuspendTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmSuspend}
                disabled={actioningId === suspendTarget?.id}
              >
                <Text style={styles.modalConfirmText}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Flag reason modal */}
      <Modal visible={!!flagTarget} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setFlagTarget(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
          pointerEvents="box-none"
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Flag {flagTarget?.name}</Text>
            <Text style={styles.modalSubtitle}>
              Their listing stays live — this just marks it for a closer look. Give a reason (shown to them, and they can reply).
            </Text>
            <TextInput
              style={styles.modalInput}
              value={flagReason}
              onChangeText={setFlagReason}
              placeholder="e.g. Suspicious pricing pattern"
              placeholderTextColor={colors.placeholder}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFlagTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmFlag}
                disabled={actioningId === flagTarget?.id}
              >
                <Text style={styles.modalConfirmText}>Flag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
    headerGradient: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    headerTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
    headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: radius.md,
      paddingHorizontal: 12,
      height: 42,
      marginTop: spacing.md,
    },
    searchInput: { flex: 1, color: colors.white, fontSize: 13, marginLeft: 8 },

    filterRow: { paddingVertical: spacing.sm + 2 },
    filterChip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 7,
      marginRight: 8,
      backgroundColor: colors.surface,
    },
    filterChipActive: { borderColor: colors.accent, backgroundColor: `${colors.accent}1A` },
    filterChipText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
    filterChipTextActive: { color: colors.accent },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm + 4,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: { width: 48, height: 48, borderRadius: radius.md },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    name: { fontSize: 13.5, fontWeight: '800', color: colors.textPrimary, flexShrink: 1, marginRight: 6 },
    statusBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
    statusBadgeText: { fontSize: 10, fontWeight: '800' },
    flagBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.errorBg, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    meta: { fontSize: 11.5, color: colors.textSecondary, marginTop: 3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    metaSmall: { fontSize: 11, color: colors.textSecondary, marginLeft: 4, fontWeight: '600' },

    actionsCol: { flexDirection: 'row', marginLeft: 6 },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 10 },

    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
    modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    modalTitle: { fontSize: 15.5, fontWeight: '800', color: colors.textPrimary },
    modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 6, lineHeight: 17 },
    modalInput: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      color: colors.textPrimary,
      fontSize: 13,
      padding: spacing.sm + 4,
      minHeight: 70,
      marginTop: spacing.md,
      textAlignVertical: 'top',
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md },
    modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 6 },
    modalCancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
    modalConfirmBtn: {
      backgroundColor: colors.error,
      borderRadius: radius.md,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    modalConfirmText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  });
}