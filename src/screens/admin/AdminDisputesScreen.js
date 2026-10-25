// src/screens/admin/AdminDisputesScreen.js
// "Disputes" tab of the Admin Panel. Every booking with a `dispute` field
// (raised from BookingDetailsScreen via DisputeModal), grouped into Open /
// Resolved / Dismissed. Resolving or dismissing writes straight back onto
// the same booking, so BookingDetailsScreen's own dispute banner updates
// automatically — no separate sync needed.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
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
import { useAdmin } from '../../context/AdminContext';
import { formatRelativeTime } from '../../utils/dateFormat';

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
];

const STATUS_COLOR = {
  open: '#DC2626',
  resolved: '#16A34A',
  dismissed: '#6B7280',
};

export default function AdminDisputesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { disputes, loading, error, resolveDispute, dismissDispute } = useAdmin();

  const [tab, setTab] = useState('open');
  const [activeBooking, setActiveBooking] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => disputes.filter((b) => b.dispute.status === tab),
    [disputes, tab]
  );

  const openReviewModal = (booking) => {
    setActiveBooking(booking);
    setNote('');
  };

  const handleResolve = async () => {
    if (!activeBooking) return;
    setBusy(true);
    try {
      await resolveDispute(activeBooking, note.trim());
      setActiveBooking(null);
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not resolve this dispute.');
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = async () => {
    if (!activeBooking) return;
    setBusy(true);
    try {
      await dismissDispute(activeBooking, note.trim());
      setActiveBooking(null);
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not dismiss this dispute.');
    } finally {
      setBusy(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => (item.dispute.status === 'open' ? openReviewModal(item) : null)}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.dot, { backgroundColor: STATUS_COLOR[item.dispute.status] }]} />
        <Text style={styles.cardId}>Booking {item.id.slice(0, 8)}</Text>
        <Text style={styles.cardTime}>{formatRelativeTime(item.dispute.createdAt)}</Text>
      </View>

      <Text style={styles.reasonText} numberOfLines={2}>{item.dispute.reason}</Text>

      <View style={styles.partiesRow}>
        <Text style={styles.partyText} numberOfLines={1}>
          Raised by: {item.dispute.raisedByName || 'Customer'}
        </Text>
        <Text style={styles.partyText} numberOfLines={1}>
          Provider: {item.provider?.name || 'Unknown'}
        </Text>
      </View>

      {item.dispute.resolutionNote ? (
        <Text style={styles.resolutionNote}>Note: {item.dispute.resolutionNote}</Text>
      ) : null}

      {item.dispute.status === 'open' ? (
        <View style={styles.reviewLink}>
          <Ionicons name="chevron-forward-circle-outline" size={14} color={colors.accent} />
          <Text style={styles.reviewLinkText}>Tap to review</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>Disputes</Text>
          <Text style={styles.headerSubtitle}>
            {disputes.filter((b) => b.dispute.status === 'open').length} open right now
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color={colors.error} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-outline" size={28} color={colors.placeholder} />
              <Text style={styles.emptyText}>No {tab} disputes.</Text>
            </View>
          ) : null
        }
      />

      <Modal visible={!!activeBooking} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setActiveBooking(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrap}
          pointerEvents="box-none"
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Review Dispute</Text>
            <Text style={styles.modalReason}>{activeBooking?.dispute?.reason}</Text>
            <Text style={styles.modalLabel}>Resolution note (sent to both parties)</Text>
            <TextInput
              style={styles.modalInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Refund issued, provider warned"
              placeholderTextColor={colors.placeholder}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} disabled={busy}>
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resolveBtn} onPress={handleResolve} disabled={busy}>
                <Text style={styles.resolveBtnText}>Resolve</Text>
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
    headerGradient: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    headerTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
    headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 },

    tabRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginTop: spacing.md },
    tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.md, marginRight: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    tabActive: { backgroundColor: `${colors.accent}1A`, borderColor: colors.accent },
    tabText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: colors.accent },

    errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.sm + 2, marginHorizontal: spacing.lg, marginTop: spacing.md },
    errorBannerText: { color: colors.error, fontSize: 12, marginLeft: 8, flex: 1 },

    card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
    cardTopRow: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 7 },
    cardId: { fontSize: 11.5, fontWeight: '700', color: colors.textSecondary, flex: 1 },
    cardTime: { fontSize: 11, color: colors.textSecondary },
    reasonText: { fontSize: 13.5, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
    partiesRow: { marginTop: 8 },
    partyText: { fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
    resolutionNote: { fontSize: 11.5, color: colors.success, marginTop: 8, fontStyle: 'italic' },
    reviewLink: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    reviewLinkText: { fontSize: 11.5, color: colors.accent, fontWeight: '700', marginLeft: 4 },

    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 10 },

    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
    modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
    modalTitle: { fontSize: 15.5, fontWeight: '800', color: colors.textPrimary },
    modalReason: { fontSize: 13, color: colors.textPrimary, marginTop: 8, lineHeight: 18 },
    modalLabel: { fontSize: 12.5, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md, marginBottom: 6 },
    modalInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, color: colors.textPrimary, fontSize: 13, padding: spacing.sm + 4, minHeight: 70, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md },
    dismissBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
    dismissBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
    resolveBtn: { backgroundColor: colors.success, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 10 },
    resolveBtnText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  });
}