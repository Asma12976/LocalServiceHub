// src/screens/customer/HelpSupportScreen.js
// Reached from ProfileScreen's "Help & Support" menu item, the drawer's
// "Help & Support" item, and SettingsScreen's Support section (see
// CustomerNavigator.js — all three just navigate('HelpSupport') so they
// land on this exact same screen).
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

const SUPPORT_EMAIL = 'asmmi098@gmail.com';
const SUPPORT_PHONE = '+923421281123';

const FAQS = [
  {
    id: 'book',
    question: 'How do I book a service?',
    answer:
      'Browse or search for a provider from Home or the Explore tab, open their profile, pick a service, and tap "Book Service" to choose a date, time, and address.',
  },
  {
    id: 'cancel',
    question: 'Can I cancel or reschedule a booking?',
    answer:
      'Yes — open the booking from "My Bookings" and use the cancel option there. Once a provider has confirmed, please contact them directly through Messages to reschedule.',
  },
  {
    id: 'provider',
    question: 'How do I become a service provider?',
    answer:
      'From your Profile menu, choose "My Business Profile" to fill in your category, services, and photo. Once saved, customers can find and book you right away.',
  },
  {
    id: 'review',
    question: 'How do I leave a review?',
    answer:
      'After a provider marks your booking as completed, open it from "My Bookings" and tap "Rate & Review" to leave a rating and comment.',
  },
  {
    id: 'emergency',
    question: 'What if I need urgent help?',
    answer:
      'Use the "Get Emergency Help" card on Home — it prioritizes matching you with the nearest available provider for your category.',
  },
  {
    id: 'payment',
    question: 'How do I pay for a service?',
    answer:
      'Pricing is agreed directly with the provider based on the job. QuickServe currently helps you discover, book, and message providers rather than process payments in-app.',
  },
];

export default function HelpSupportScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState(null);

  const toggleFaq = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleEmail = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('QuickServe Support Request')}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('No Email App Found', `You can reach us at ${SUPPORT_EMAIL}`);
      }
    } catch (err) {
      Alert.alert('Something went wrong', `You can reach us at ${SUPPORT_EMAIL}`);
    }
  };

  const handleCall = async () => {
    const url = `tel:${SUPPORT_PHONE}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Call Not Supported', `You can reach us at ${SUPPORT_PHONE}`);
      }
    } catch (err) {
      Alert.alert('Something went wrong', `You can reach us at ${SUPPORT_PHONE}`);
    }
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
            <Text style={styles.headerTitle}>Help & Support</Text>
            <View style={styles.circleBtnSpacer} />
          </View>
          <Text style={styles.headerSubtitle}>We're here whenever you need us</Text>
        </LinearGradient>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Contact us */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow} onPress={handleEmail} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Ionicons name="mail-outline" size={17} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Email Us</Text>
              <Text style={styles.menuSubLabel}>{SUPPORT_EMAIL}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuRow, styles.menuRowLast]} onPress={handleCall} activeOpacity={0.7}>
            <View style={styles.menuIconWrap}>
              <Ionicons name="call-outline" size={17} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Call Us</Text>
              <Text style={styles.menuSubLabel}>{SUPPORT_PHONE}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.placeholder} />
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.card}>
          {FAQS.map((faq, index) => {
            const expanded = expandedId === faq.id;
            return (
              <TouchableOpacity
                key={faq.id}
                style={[
                  styles.faqRow,
                  index === FAQS.length - 1 && !expanded ? styles.menuRowLast : null,
                ]}
                onPress={() => toggleFaq(faq.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeaderRow}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.placeholder}
                  />
                </View>
                {expanded ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.footerText}>
          Still need help? Reach out via email or call and our team will get back to you.
        </Text>
      </ScrollView>
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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
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
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12.5,
    marginTop: spacing.md,
    marginLeft: 2,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  menuLabel: {
    fontSize: 13.5,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  menuSubLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },

  faqRow: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  faqAnswer: {
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: spacing.sm,
  },

  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
}