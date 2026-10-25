// src/screens/customer/CategoriesScreen.js
// This is the "Explore" tab — browse every provider, filter by category, and
// switch between a single-column list and a 2-column grid.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import AuthBackdrop from '../../components/Authbackdrop';
import SearchBar from '../../components/SearchBar';
import CategoryCard from '../../components/CategoryCard';
import ProviderCard from '../../components/ProviderCard';
import ProviderGridCard from '../../components/ProviderGridCard';
import CategoryFilterSheet from '../../components/CategoryFilterSheet';
import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { categories, providers as mockProviders } from '../../data/mockData';
import { useProvider } from '../../context/ProviderContext';

export default function CategoriesScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(route.params?.categoryId ?? null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  // Real providers who have saved a business profile come live from
  // Firestore via ProviderContext — merge them with the starter mock
  // providers so both appear together when browsing/filtering by category.
  //
  // liveStatsById is also merged in for both groups here, same as
  // HomeScreen: mock providers ship with fixed reviews numbers in
  // mockData.js, and a real provider's providers/{id} doc always starts at
  // reviews: 0 (the aggregate-write step in BookingsContext.submitReview
  // commonly fails with permission-denied — see the comment on
  // liveStatsById in ProviderContext). Without this merge, every card here
  // shows "0 reviews" no matter how many real reviews a provider has.
  const { allProviders, liveStatsById } = useProvider();
  const providers = useMemo(() => {
    const withLiveStats = (list) =>
      list.map((p) => {
        const live = liveStatsById[p.id];
        return live ? { ...p, rating: live.rating, reviews: live.reviews } : p;
      });
    return [...withLiveStats(mockProviders), ...withLiveStats(allProviders)];
  }, [allProviders, liveStatsById]);

  // A category tapped on Home (via the filter sheet) arrives as a param —
  // pick it up whenever it changes, e.g. tapping a different category again.
  useEffect(() => {
    if (route.params?.categoryId !== undefined) {
      setSelectedCategory(route.params.categoryId);
    }
  }, [route.params?.categoryId]);

  const selectedCategoryName = categories.find((c) => c.id === selectedCategory)?.name;

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
      const matchesSearch = search ? p.name.toLowerCase().includes(search.toLowerCase()) : true;
      return matchesCategory && matchesSearch;
    });
  }, [providers, search, selectedCategory]);

  const handleCategoryPress = (id) => {
    setSelectedCategory((prev) => (prev === id ? null : id));
  };

  const handleProviderPress = (provider) => {
    navigation.navigate('ProviderDetails', { provider });
  };

  const renderItem = ({ item }) =>
    viewMode === 'grid' ? (
      <View style={styles.gridCell}>
        <ProviderGridCard provider={item} onPress={() => handleProviderPress(item)} />
      </View>
    ) : (
      <ProviderCard provider={item} onPress={() => handleProviderPress(item)} />
    );

  const listHeader = (
    <View>
      {/* Header — same gradient treatment as Home, with a view-mode toggle
          in the top-right corner: list icon shows one column, grid icon
          shows a 2-column grid. */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.navy, colors.navySoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 24) + 14 }]}
        >
          <AuthBackdrop />

          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} hitSlop={10} style={styles.compassBtn}>
              <Ionicons name="compass-outline" size={20} color={colors.white} />
            </TouchableOpacity>

            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('list')}
                hitSlop={4}
              >
                <Ionicons name="list" size={17} color={viewMode === 'list' ? colors.accent : colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('grid')}
                hitSlop={4}
              >
                <Ionicons name="grid" size={16} color={viewMode === 'grid' ? colors.accent : colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.title}>Browse Services</Text>
          <Text style={styles.subtitle}>Find the right provider near you</Text>
        </LinearGradient>
      </View>

      {/* Floating search bar + filter button, same pattern as Home */}
      <View style={styles.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search or tap mic to search..." />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterSheetVisible(true)} activeOpacity={0.85}>
          <Ionicons name="options-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Category chip row */}
      <FlatList
        horizontal
        data={[
          { id: null, name: 'All', image: 'https://picsum.photos/seed/all-categories/300/300' },
          ...categories,
        ]}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
        style={styles.categoriesList}
        renderItem={({ item }) => (
          <CategoryCard 
  name={item.name} 
  icon={item.icon}
  selected={selectedCategory === item.id} 
  onPress={() => handleCategoryPress(item.id)} 
/>
        )}
      />

      {/* Results header */}
      <View style={styles.resultsHeaderRow}>
        <Text style={styles.resultsCount}>{filteredProviders.length} results</Text>
        {selectedCategory ? (
          <TouchableOpacity style={styles.selectedChip} onPress={() => setSelectedCategory(null)} activeOpacity={0.8}>
            <Text style={styles.selectedChipText}>{selectedCategoryName}</Text>
            <Ionicons name="close" size={14} color={colors.white} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Everything — header, search bar, category chips, and the results —
          lives inside ONE FlatList (header content goes through
          ListHeaderComponent) so the whole screen scrolls together. Nothing
          stays pinned/sticky at the top. */}
      <FlatList
        key={viewMode}
        style={styles.list}
        data={filteredProviders}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={styles.resultsList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={28} color={colors.placeholder} />
            <Text style={styles.emptyText}>No providers match your search</Text>
          </View>
        }
      />

      <CategoryFilterSheet
        visible={filterSheetVisible}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={(id) => setSelectedCategory(id)}
        onClose={() => setFilterSheetVisible(false)}
      />
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },

  // Header
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: 34,
    paddingHorizontal: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compassBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.md,
    padding: 3,
  },
  viewToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: colors.white,
  },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 3,
  },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: -22,
  },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    shadowColor: colors.accentGradientEnd,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  // Category row
  categoriesList: {
    flexGrow: 0,
    marginTop: spacing.xl,
  },
  categoriesRow: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },

  // Results header
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedChipText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Results list
  resultsList: {
    paddingBottom: spacing.xxl + 70, // clears the floating (position: absolute) tab bar
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  gridCell: {
    width: '48.5%',
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
  },
});
}