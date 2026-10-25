// src/components/ChatBubble.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius, spacing, typography } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { formatMessageTime } from '../utils/dateFormat';

export default function ChatBubble({ message, isMine }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // createdAt is null for the few hundred ms before Firestore's
  // serverTimestamp() resolves on a just-sent message - fall back to "now"
  // rather than showing a blank time on my own outgoing bubble.
  const time = formatMessageTime(message.createdAt) || (isMine ? formatMessageTime(new Date()) : '');

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
          {message.text}
        </Text>
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>{time}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  bubbleMine: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    ...typography.body,
    lineHeight: 20,
  },
  textMine: {
    color: colors.white,
  },
  textTheirs: {
    color: colors.textPrimary,
  },
  time: {
    ...typography.small,
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: 'rgba(255,255,255,0.75)',
  },
  timeTheirs: {
    color: colors.textSecondary,
  },
});
}
