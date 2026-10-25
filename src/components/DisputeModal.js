// src/components/DisputeModal.js
// Bottom-sheet used by BookingDetailsScreen to raise a dispute on a
// booking ("provider didn't show up", "wrong amount charged", etc.).
// Feeds BookingsContext.fileDispute -> booking.dispute, which is what
// powers the Admin Panel's Disputes tab (AdminDisputesScreen).
//
// Contract (already wired up by BookingDetailsScreen):
//   visible    - bool, show/hide the sheet
//   onClose    - called on backdrop tap / X button
//   onSubmit   - called with the final reason string
//   colors     - the active theme's color object (passed down so this
//                stays a plain component, not tied to useTheme() itself)
//   submitting - bool, disables the button + shows a spinner while
//                fileDispute() is in flight
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius } from '../theme/colors';
import GradientButton from './GradientButton';

const QUICK_REASONS = [
  "Provider didn't show up",
  'Wrong amount charged',
  'Work not as described',
  'Rude or unprofessional behavior',
  'Other',
];

export default function DisputeModal({ visible, onClose, onSubmit, colors, submitting }) {
  const styles = makeStyles(colors);
  const [selectedReason, setSelectedReason] = useState(null);
  const [details, setDetails] = useState('');

  const handleClose = () => {
    if (submitting) return;
    setSelectedReason(null);
    setDetails('');
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedReason) return;

    const fullReason =
      selectedReason === 'Other'
        ? details.trim()
        : details.trim()
        ? `${selectedReason} — ${details.trim()}`
        : selectedReason;

    if (!fullReason) return;

    onSubmit(fullReason);
  };

  const canSubmit =
    !!selectedReason && (selectedReason !== 'Other' || details.trim().length > 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Raise a Dispute</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={10} disabled={submitting}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Tell us what went wrong — our support team will review it and get back to you.
          </Text>

          <View style={styles.reasonsWrap}>
            {QUICK_REASONS.map((reason) => {
              const active = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonChip, active && styles.reasonChipActive]}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>
            {selectedReason === 'Other' ? 'What happened?' : 'Additional details (optional)'}
          </Text>
          <TextInput
            style={styles.textArea}
            value={details}
            onChangeText={setDetails}
            placeholder={
              selectedReason === 'Other'
                ? 'Describe the issue in a few words...'
                : 'Anything else we should know...'
            }
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <GradientButton
            title="Submit Dispute"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    sheetWrap: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 12.5,
      color: colors.textSecondary,
      marginTop: 6,
      lineHeight: 18,
    },
    reasonsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.md,
      marginHorizontal: -4,
    },
    reasonChip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
      margin: 4,
      backgroundColor: colors.background,
    },
    reasonChipActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}1A`,
    },
    reasonChipText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    reasonChipTextActive: {
      color: colors.accent,
      fontWeight: '800',
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: 6,
    },
    textArea: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      fontSize: 13.5,
      padding: spacing.sm + 4,
      minHeight: 90,
    },
  });
}