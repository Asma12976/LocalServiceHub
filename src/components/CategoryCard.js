// src/components/CategoryCard.js
import React, { useMemo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function CategoryCard({
  name,
  icon,
  selected = false,
  onPress,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.card}
    >
      <View
        style={[
          styles.iconWrap,
          selected && styles.iconWrapSelected,
        ]}
      >
        <Ionicons
          name={icon || 'apps-outline'}
          size={28}
          color={selected ? colors.white : colors.accent}
        />
      </View>

      <Text
        style={[styles.label, selected && styles.labelSelected]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  card: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    marginBottom: 7,
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(14, 165, 233, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrapSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  labelSelected: {
    color: colors.accent,
  },
});
}