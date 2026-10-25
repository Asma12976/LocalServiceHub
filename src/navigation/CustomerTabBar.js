// src/navigation/CustomerTabBar.js
// Custom bottom bar: 2 tabs — floating center action button — 2 tabs,
// same layout as the reference design (icons split left/right with a
// raised circular button overlapping the middle of the bar).
import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Categories: { active: 'grid', inactive: 'grid-outline' },
  Bookings: { active: 'calendar', inactive: 'calendar-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export default function CustomerTabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const leftRoutes = routes.slice(0, 2);
  const rightRoutes = routes.slice(2, 4);

  const renderTab = (route, index) => {
    const isFocused = state.index === index;
    const icon = ICONS[route.name];
    const iconName = isFocused ? icon.active : icon.inactive;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabButton} activeOpacity={0.7}>
        <Ionicons name={iconName} size={22} color={isFocused ? colors.accent : colors.placeholder} />
        <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{route.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.side}>{leftRoutes.map((r, i) => renderTab(r, i))}</View>
        <View style={styles.fabSpacer} />
        <View style={styles.side}>{rightRoutes.map((r, i) => renderTab(r, i + 2))}</View>
      </View>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AIAssistant')}
      >
        <LinearGradient
          colors={[colors.accentGradientStart, colors.accentGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="sparkles" size={24} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 12,
    shadowColor: colors.navy,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },
  side: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  fabSpacer: {
    width: 66,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.placeholder,
    marginTop: 3,
  },
  tabLabelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    top: -26,
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentGradientEnd,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
  },
});
}