// src/screens/customer/EditProfileScreen.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import InputField from '../../components/InputField';
import GradientButton from '../../components/GradientButton';
import { validateName, validatePhone, validateRequired } from '../../utils/validation';
import { analyzePhotoQuality } from '../../services/aiService';

export default function EditProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user, updateProfile, uploadProfilePhoto } = useUser();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || '');
  const [area, setArea] = useState(user?.area || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoQuality, setPhotoQuality] = useState(null);
  const [checkingPhotoQuality, setCheckingPhotoQuality] = useState(false);

  const avatarInitial = (name.trim().charAt(0) || '?').toUpperCase();

  const validate = () => {
    const newErrors = {
      name: validateName(name),
      phone: validatePhone(phone),
      city: validateRequired(city, 'City'),
    };
    setErrors(newErrors);
    return Object.values(newErrors).every((e) => !e);
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        area: area.trim(),
      });
      Alert.alert('Profile Updated', 'Your changes have been saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Update Failed', err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Runs the actual picker (camera or gallery) after permission is granted,
  // then immediately uploads the chosen image to Firebase Storage and
  // saves the new photoURL to Firestore + Auth via the context.
  const checkPhotoQuality = async (uploadedURL) => {
    setCheckingPhotoQuality(true);
    setPhotoQuality(null);

    try {
      const result = await analyzePhotoQuality({
        photoUrl: uploadedURL,
        context: 'profile',
      });
      setPhotoQuality(result);
    } finally {
      setCheckingPhotoQuality(false);
    }
  };

  const pickAndUpload = async (source) => {
    try {
      let permissionResult;
      if (source === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Needed',
          source === 'camera'
            ? 'Camera access is required to take a photo.'
            : 'Gallery access is required to choose a photo.'
        );
        return;
      }

    const pickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.6,
};

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets || !result.assets.length) return;

      const localUri = result.assets[0].uri;

      // Show the picked photo immediately, then upload in the background.
      setPhotoURL(localUri);
      setUploadingPhoto(true);

      const uploadedURL = await uploadProfilePhoto(localUri);
      setPhotoURL(uploadedURL);

      // Let the AI quality check run in the background.
      checkPhotoQuality(uploadedURL);
    } catch (err) {
      Alert.alert('Upload Failed', err?.message || 'Could not update your photo. Try again.');
      setPhotoURL(user?.photoURL || '');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => pickAndUpload('camera') },
      { text: 'Choose from Gallery', onPress: () => pickAndUpload('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.navy, colors.navySoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 14 }]}
          >
            <View style={styles.decorCircleBig} pointerEvents="none" />
            <View style={styles.decorCircleSmall} pointerEvents="none" />

            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={20} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.headerLabel}>Edit Profile</Text>
              <View style={styles.backBtn} />
            </View>
          </LinearGradient>
        </View>

        {/* Floating avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={[colors.accentGradientStart, colors.accentGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </LinearGradient>
            )}

            {uploadingPhoto ? (
              <View style={styles.avatarUploadingOverlay}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={handleChangePhoto}
              disabled={uploadingPhoto}
              hitSlop={6}
            >
              <Ionicons name="camera" size={13} color={colors.white} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleChangePhoto} disabled={uploadingPhoto}>
            <Text style={styles.avatarHint}>
              {uploadingPhoto ? 'Uploading photo...' : 'Tap the camera icon to change your photo'}
            </Text>
          </TouchableOpacity>

          {!uploadingPhoto && (checkingPhotoQuality || photoQuality) ? (
            <View style={styles.photoQualityRow}>
              {checkingPhotoQuality ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons
                  name={
                    photoQuality?.error
                      ? 'information-circle-outline'
                      : photoQuality?.suitable
                      ? 'checkmark-circle'
                      : 'alert-circle-outline'
                  }
                  size={14}
                  color={
                    photoQuality?.error
                      ? colors.textSecondary
                      : photoQuality?.suitable
                      ? colors.success
                      : colors.error
                  }
                />
              )}

              <Text style={styles.photoQualityText}>
                {checkingPhotoQuality
                  ? 'Checking photo...'
                  : photoQuality?.error
                  ? photoQuality.message || "Couldn't check this photo."
                  : photoQuality?.feedback}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <InputField
            label="Full Name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            autoCapitalize="words"
            error={errors.name}
          />

          <InputField
            label="Email"
            icon="mail-outline"
            value={user?.email || ''}
            editable={false}
            placeholder="Email"
          />
          <Text style={styles.helperText}>Email can't be changed here.</Text>

          <InputField
            label="Phone Number"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 03001234567"
            keyboardType="phone-pad"
            error={errors.phone}
          />

          <InputField
            label="City"
            icon="location-outline"
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Islamabad"
            autoCapitalize="words"
            error={errors.city}
          />

          <InputField
            label="Area"
            icon="navigate-outline"
            value={area}
            onChangeText={setArea}
            placeholder="e.g. F-10 Markaz"
            autoCapitalize="words"
          />

          <GradientButton
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          />

          <GradientButton
            title="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
            disabled={saving}
            style={styles.cancelBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerGradient: {
    height: 108,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  decorCircleBig: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -70,
    right: -50,
  },
  decorCircleSmall: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30,
    left: 30,
  },

  avatarCard: {
    marginTop: -46,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatarWrap: {
    marginTop: -40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(7, 26, 43, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarHint: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  photoQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: spacing.lg,
  },

  photoQualityText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginLeft: 5,
    textAlign: 'center',
    flexShrink: 1,
  },

  formCard: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  helperText: {
    fontSize: 11,
    color: colors.placeholder,
    marginTop: -spacing.sm + 2,
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});
}