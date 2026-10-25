
// src/components/SearchBar.js

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

import * as FileSystem from 'expo-file-system/legacy';

import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { transcribeAudio } from '../services/aiService';

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search for a service...',
  style,
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  // expo-audio recorder
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Prevent duplicate stop calls
  const stoppingRef = useRef(false);

  useEffect(() => {
    return () => {
      // Reset local state when component unmounts.
      // expo-audio manages the recorder lifecycle.
      stoppingRef.current = false;
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Microphone Needed',
          'Microphone access is required to use voice search.'
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();

      recorder.record();

      setIsRecording(true);
    } catch (err) {
      setIsRecording(false);

      Alert.alert(
        'Voice Search',
        err?.message || 'Could not start recording. Please try again.'
      );
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (stoppingRef.current) return;

    stoppingRef.current = true;
    setIsRecording(false);
    setTranscribing(true);

    try {
      await recorder.stop();

      const uri = recorder.uri;

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (!uri) {
        throw new Error('Recording did not save correctly.');
      }

      const result = await transcribeAudio(uri);

      // Best-effort cleanup of temporary recording file.
      FileSystem.deleteAsync(uri, {
        idempotent: true,
      }).catch(() => {});

      if (result.error || !result.text) {
        Alert.alert(
          'Voice Search',
          result.message || "Couldn't understand that. Please try again."
        );
      } else {
        onChangeText(result.text);
      }
    } catch (err) {
      Alert.alert(
        'Voice Search',
        err?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setTranscribing(false);
      stoppingRef.current = false;
    }
  };

  const handleMicPress = () => {
    if (transcribing) return;

    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Ionicons
        name="search"
        size={19}
        color={colors.accent}
        style={styles.icon}
      />

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={isRecording ? 'Listening...' : placeholder}
        placeholderTextColor={colors.placeholder}
        returnKeyType="search"
        editable={!isRecording && !transcribing}
      />

      {value && !isRecording && !transcribing ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={8}
          style={styles.clearBtn}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.placeholder}
          />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        onPress={handleMicPress}
        disabled={transcribing}
        hitSlop={8}
        style={[
          styles.micBtn,
          isRecording && styles.micBtnActive,
        ]}
        activeOpacity={0.8}
      >
        {transcribing ? (
          <ActivityIndicator
            size="small"
            color={colors.accent}
          />
        ) : (
          <Ionicons
            name={isRecording ? 'mic' : 'mic-outline'}
            size={17}
            color={isRecording ? '#FFFFFF' : colors.accent}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      height: 52,
      shadowColor: colors.navy,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      elevation: 4,
    },

    icon: {
      marginRight: 9,
    },

    input: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
    },

    clearBtn: {
      marginLeft: 4,
      marginRight: 2,
    },

    micBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },

    micBtnActive: {
      backgroundColor: colors.accent,
    },
  });
}

