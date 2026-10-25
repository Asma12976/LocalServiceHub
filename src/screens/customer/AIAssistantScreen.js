// src/screens/customer/AIAssistantScreen.js
// AI Feature 1 (QuickServe.docx section 6) — "AI Service Assistant".
// Opened from HomeScreen's "AI Assistant" promo card. Customer describes
// their problem in plain language, Gemini (via src/services/aiService.js)
// replies conversationally and — once confident — tags the message with a
// matched category, which renders a "View <Category> providers" button
// that jumps straight into CategoriesScreen pre-filtered.
import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { categories } from '../../data/mockData';
import { askServiceAssistant } from '../../services/aiService';

let messageIdCounter = 0;
function nextId() {
  messageIdCounter += 1;
  return `msg-${Date.now()}-${messageIdCounter}`;
}

const GREETING = {
  id: nextId(),
  role: 'ai',
  text: "Hi! I'm your AI Service Assistant 🤖 Describe the problem you're facing and I'll suggest the right service for you — for example, \"my kitchen tap is leaking\" or \"AC isn't cooling properly\".",
  categoryId: null,
};

export default function AIAssistantScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);

  const [messages, setMessages] = useState([GREETING]);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);

  const scrollToEnd = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const userMsg = { id: nextId(), role: 'user', text: trimmed, categoryId: null };
    const historyForApi = messages
      .filter((m) => m.id !== GREETING.id || messages.length > 1)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setText('');
    setThinking(true);
    scrollToEnd();

    const result = await askServiceAssistant(trimmed, historyForApi);

    const aiMsg = {
      id: nextId(),
      role: 'ai',
      text: result.reply,
      categoryId: result.categoryId,
      error: result.error,
    };
    setMessages((prev) => [...prev, aiMsg]);
    setThinking(false);
    scrollToEnd();
  };

  const handleViewProviders = (categoryId) => {
    // AIAssistantScreen sits on the root Stack, above the Drawer -> Tab
    // navigators, so getting to a specific tab (Categories) with params
    // needs a nested navigate call all the way down.
    navigation.navigate('CustomerRoot', {
      screen: 'CustomerTabs',
      params: {
        screen: 'Categories',
        params: { categoryId },
      },
    });
  };

  const renderItem = ({ item }) => {
    const isAi = item.role === 'ai';
    const categoryName = item.categoryId
      ? categories.find((c) => c.id === item.categoryId)?.name
      : null;

    return (
      <View style={[styles.row, isAi ? styles.rowAi : styles.rowUser]}>
        <View style={[styles.bubble, isAi ? styles.bubbleAi : styles.bubbleUser]}>
          <Text style={[styles.bubbleText, isAi ? styles.bubbleTextAi : styles.bubbleTextUser]}>
            {item.text}
          </Text>
        </View>

        {isAi && categoryName ? (
          <TouchableOpacity
            style={styles.matchChip}
            activeOpacity={0.85}
            onPress={() => handleViewProviders(item.categoryId)}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
            <Text style={styles.matchChipText}>View {categoryName} providers</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.accent} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <LinearGradient
          colors={[colors.navy, colors.navySoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.circleBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={18} color={colors.white} />
          </View>

          <View>
            <Text style={styles.headerTitle}>AI Service Assistant</Text>
            <Text style={styles.headerSubtitle}>Powered by Gemini</Text>
          </View>
        </LinearGradient>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
      />

      {thinking ? (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.typingText}>Thinking...</Text>
        </View>
      ) : null}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          placeholder="Describe your problem..."
          placeholderTextColor={colors.placeholder}
          value={text}
          onChangeText={setText}
          multiline
          editable={!thinking}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || thinking) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || thinking}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={17} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
    },
    circleBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    headerAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      marginRight: spacing.sm,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      ...typography.h3,
      color: colors.white,
    },
    headerSubtitle: {
      ...typography.small,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 1,
    },

    listContent: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
    },

    row: {
      marginBottom: spacing.md,
    },
    rowAi: {
      alignItems: 'flex-start',
    },
    rowUser: {
      alignItems: 'flex-end',
    },
    bubble: {
      maxWidth: '82%',
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radius.lg,
    },
    bubbleAi: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleUser: {
      backgroundColor: colors.accent,
      borderBottomRightRadius: 4,
    },
    bubbleText: {
      ...typography.body,
      lineHeight: 20,
    },
    bubbleTextAi: {
      color: colors.textPrimary,
    },
    bubbleTextUser: {
      color: colors.white,
    },

    matchChip: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.pill,
      paddingVertical: 8,
      paddingHorizontal: 14,
      gap: 6,
    },
    matchChipText: {
      ...typography.small,
      color: colors.accent,
      fontWeight: '700',
    },

    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      gap: 8,
    },
    typingText: {
      ...typography.small,
      color: colors.textSecondary,
    },

    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      maxHeight: 100,
      backgroundColor: colors.cardBg,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      color: colors.textPrimary,
      ...typography.body,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.5,
    },
  });
}