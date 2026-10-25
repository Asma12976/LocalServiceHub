// src/components/CategoryFilterSheet.js
// Bottom-sheet modal: tap the filter button next to the search bar to pick a
// category as a quick shortcut into the Explore tab, pre-filtered.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function CategoryFilterSheet({ visible, categories, selectedCategory, onSelect, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const handleSelect = (id) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.grabber} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Filter by Category</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.pillsWrap}>
            <Pill colors={colors} styles={styles}
              label="All"
              icon="apps-outline"
              active={!selectedCategory}
              onPress={() => handleSelect(null)}
            />
            {categories.map((cat) => (
              <Pill colors={colors} styles={styles}
                key={cat.id}
                label={cat.name}
                icon={cat.icon}
                active={selectedCategory === cat.id}
                onPress={() => handleSelect(cat.id)}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Pill({ label, icon, active, onPress, colors, styles}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Ionicons name={icon} size={14} color={active ? colors.white : colors.accent} style={{ marginRight: 6 }} />
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    shadowColor: colors.navy,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  grabber: {
    width: 42,
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
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.accent,
  },
  pillTextActive: {
    color: colors.white,
  },
});
}