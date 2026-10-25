// src/screens/customer/BookingScreen.js
// The core "Book Service" flow. Opened from ProviderDetailsScreen when the
// customer taps "Book Service" (or "Book" on one specific service).
// Customer picks: service -> date -> time slot -> address -> problem
// description -> optional photo, sees an AI price estimate, then confirms.
// On confirm, a booking is created in BookingsContext and the customer is
// taken to BookingConfirmationScreen.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { spacing, radius, typography } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useBookings } from '../../context/BookingsContext';
import { categories } from '../../data/mockData';
import { estimateServicePrice, quickEstimateRange, analyzeProblemImage } from '../../services/aiService';

// Same Cloudinary account/preset used everywhere else photo upload already
// works (UserContext.uploadProfilePhoto, ProviderContext.uploadProviderPhoto)
// — its own folder so problem photos don't mix with profile/business photos.
const CLOUDINARY_CLOUD_NAME = 'ehirq7yx';
const CLOUDINARY_UPLOAD_PRESET = 'localservicehub_profiles';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const TIME_SLOTS = [
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '1:00 PM - 2:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM',
  '4:00 PM - 5:00 PM',
  '5:00 PM - 6:00 PM',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildNextDays(count) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      key: d.toISOString().slice(0, 10),
      weekday: WEEKDAY_LABELS[d.getDay()],
      dayNumber: d.getDate(),
      fullLabel: `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`,
      isToday: i === 0,
    });
  }
  return days;
}

// Price estimation now lives in src/services/aiService.js
// (quickEstimateRange for the instant local fallback, estimateServicePrice
// for the real Gemini-backed estimate) — see the useEffect below.

export default function BookingScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { addBooking } = useBookings();
  const { provider, service: preselectedService } = route.params || {};

  const dateOptions = useMemo(() => buildNextDays(14), []);

  const [selectedService, setSelectedService] = useState(preselectedService || null);
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [address, setAddress] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [photoAnalysis, setPhotoAnalysis] = useState(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  const [estimate, setEstimate] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const estimateRequestId = useRef(0);
  // Optional chaining here since `provider` can briefly be undefined before
  // the early-return below runs — these hooks must stay unconditional.
  const categoryName = categories.find((c) => c.id === provider?.categoryId)?.name;

  useEffect(() => {
    const basePrice = selectedService?.price;
    if (!basePrice) {
      setEstimate(null);
      setEstimateLoading(false);
      return undefined;
    }

    // Show the instant local estimate right away so the card never looks
    // empty while typing, then refine it with a real Gemini call once the
    // customer has described enough of the problem for that to be useful.
    setEstimate(quickEstimateRange(basePrice));

    const description = problemDescription.trim();
    if (description.length < 8) {
      setEstimateLoading(false);
      return undefined;
    }

    const requestId = ++estimateRequestId.current;
    setEstimateLoading(true);

    // Debounce: wait until the customer pauses typing for ~900ms before
    // calling Gemini, so we don't fire an API request on every keystroke.
    const timer = setTimeout(async () => {
      const result = await estimateServicePrice({
        basePrice,
        problemDescription: description,
        serviceName: selectedService?.name,
        categoryName,
      });
      // Ignore a response that arrives after the customer changed the
      // service or kept typing — a newer request has already superseded it.
      if (requestId !== estimateRequestId.current) return;
      setEstimate(result || quickEstimateRange(basePrice));
      setEstimateLoading(false);
    }, 900);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService, problemDescription]);

  if (!provider) {
    return (
      <View style={styles.missingScreen}>
        <Text style={styles.missingText}>Provider not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.missingBtn}>
          <Text style={styles.missingBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const services = provider.services || [];
  const selectedDate = dateOptions.find((d) => d.key === selectedDateKey);

  // Runs automatically after a photo finishes uploading to Cloudinary —
  // not awaited by the upload flow itself, so it never blocks the
  // "Confirm Booking" button. See src/services/aiService.js.
  const analyzePhoto = async (uploadedURL) => {
    setAnalyzingPhoto(true);
    setPhotoAnalysis(null);

    try {
      const result = await analyzeProblemImage(uploadedURL);
      setPhotoAnalysis(result);
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handleAttachImage = () => {
    Alert.alert('Attach Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => pickAndUploadImage('camera') },
      { text: 'Choose from Gallery', onPress: () => pickAndUploadImage('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickAndUploadImage = async (source) => {
    try {
      const permissionResult =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

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
        aspect: [4, 3],
        quality: 0.6,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets || !result.assets.length) {
        return;
      }

      const localUri = result.assets[0].uri;

      setImageUri(localUri);
      setUploadingImage(true);

      const response = await FileSystem.uploadAsync(CLOUDINARY_UPLOAD_URL, localUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'image/jpeg',
        parameters: {
          upload_preset: CLOUDINARY_UPLOAD_PRESET,
          folder: 'booking_photos',
        },
      });

      if (response.status < 200 || response.status >= 300) {
        let errorMessage = 'Photo upload failed.';
        try {
          const errorData = JSON.parse(response.body);
          errorMessage = errorData?.error?.message || errorMessage;
        } catch (parseError) {
          // Ignore — fall back to the generic message above.
        }
        throw new Error(errorMessage);
      }

      let cloudinaryData;
      try {
        cloudinaryData = JSON.parse(response.body);
      } catch (parseError) {
        throw new Error('Invalid response received from Cloudinary.');
      }

      const uploadedURL = cloudinaryData?.secure_url;
      if (!uploadedURL) {
        throw new Error('Cloudinary did not return a photo URL.');
      }

      setImageUri(uploadedURL);

      // Fire-and-forget: let the AI analysis run in the background while
      // the customer keeps filling out the rest of the form.
      analyzePhoto(uploadedURL);
    } catch (err) {
      Alert.alert('Upload Failed', err?.message || 'Could not upload your photo. Try again.');
      setImageUri(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setPhotoAnalysis(null);
  };

  const handleConfirm = () => {
    if (!selectedService) {
      Alert.alert('Select a Service', 'Please choose which service you want to book.');
      return;
    }
    if (!selectedDateKey) {
      Alert.alert('Select a Date', 'Please choose a date for the service.');
      return;
    }
    if (!selectedTimeSlot) {
      Alert.alert('Select a Time', 'Please choose a time slot.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Address Required', 'Please enter the address where the service is needed.');
      return;
    }
    if (!problemDescription.trim()) {
      Alert.alert('Description Required', 'Please briefly describe the problem.');
      return;
    }

    if (uploadingImage) {
      Alert.alert('Please Wait', 'Your photo is still uploading.');
      return;
    }

    setSubmitting(true);

    const booking = addBooking({
      provider: {
        id: provider.id,
        name: provider.name,
        image: provider.image,
        categoryId: provider.categoryId,
        phone: provider.phone || '',
      },
      service: selectedService,
      dateLabel: selectedDate.fullLabel,
      timeSlot: selectedTimeSlot,
      address: address.trim(),
      problemDescription: problemDescription.trim(),
      hasImage: !!imageUri,
      imageUrl: imageUri || null,
      estimate,
    });

    setSubmitting(false);
    navigation.replace('BookingConfirmation', { bookingId: booking.id });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      {/* Header */}
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
            <Text style={styles.headerTitle}>Book Service</Text>
            <View style={styles.circleBtnSpacer} />
          </View>

          <View style={styles.providerMiniRow}>
            <Image source={{ uri: provider.image }} style={styles.providerAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.providerName} numberOfLines={1}>{provider.name}</Text>
              <View style={styles.providerRatingRow}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.providerRatingText}>
                  {provider.rating} · {provider.reviews} reviews
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <View style={styles.chipsWrap}>
            {services.map((service) => {
              const active = selectedService?.id === service.id;
              return (
                <TouchableOpacity
                  key={service.id}
                  style={[styles.serviceChip, active && styles.serviceChipActive]}
                  onPress={() => setSelectedService(service)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.serviceChipText, active && styles.serviceChipTextActive]}>
                    {service.name}
                  </Text>
                  <Text style={[styles.serviceChipPrice, active && styles.serviceChipPriceActive]}>
                    Rs. {service.price}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: spacing.lg }}>
            {dateOptions.map((d) => {
              const active = selectedDateKey === d.key;
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[styles.dateCard, active && styles.dateCardActive]}
                  onPress={() => setSelectedDateKey(d.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.dateWeekday, active && styles.dateTextActive]}>
                    {d.isToday ? 'Today' : d.weekday}
                  </Text>
                  <Text style={[styles.dateNumber, active && styles.dateTextActive]}>{d.dayNumber}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time</Text>
          <View style={styles.chipsWrap}>
            {TIME_SLOTS.map((slot) => {
              const active = selectedTimeSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeChip, active && styles.timeChipActive]}
                  onPress={() => setSelectedTimeSlot(slot)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{slot}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.textAreaWrap}>
            <TextInput
              style={styles.textArea}
              value={address}
              onChangeText={setAddress}
              placeholder="House / Street / Area"
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Problem description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Description</Text>
          <View style={styles.textAreaWrap}>
            <TextInput
              style={[styles.textArea, { minHeight: 84 }]}
              value={problemDescription}
              onChangeText={setProblemDescription}
              placeholder="Describe the problem in your own words..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Optional image */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Photo (Optional)</Text>

          {imageUri ? (
            <View style={styles.imagePreviewWrap}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />

              {uploadingImage ? (
                <View style={styles.imageUploadingOverlay}>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.imageUploadingText}>Uploading...</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imageRemoveBtn}
                  onPress={handleRemoveImage}
                  hitSlop={8}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={16} color={colors.white} />
                </TouchableOpacity>
              )}

              {!uploadingImage ? (
                <TouchableOpacity
                  style={styles.imageChangeBtn}
                  onPress={handleAttachImage}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={14} color={colors.white} />
                  <Text style={styles.imageChangeBtnText}>Change</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <TouchableOpacity style={styles.imageBtn} onPress={handleAttachImage} activeOpacity={0.85}>
              <Ionicons name="camera-outline" size={18} color={colors.accent} />
              <Text style={styles.imageBtnText}>Upload Image (Optional)</Text>
            </TouchableOpacity>
          )}

          {/* AI Photo Analysis */}
          {imageUri && !uploadingImage && (analyzingPhoto || photoAnalysis) ? (
            <View style={styles.photoAnalysisCard}>
              <View style={styles.estimateHeaderRow}>
                <Ionicons name="scan-outline" size={16} color={colors.accent} />
                <Text style={styles.estimateTitle}>AI Photo Analysis</Text>
                {analyzingPhoto ? (
                  <ActivityIndicator size="small" color={colors.accent} style={{ marginLeft: 6 }} />
                ) : null}
              </View>

              <Text style={styles.estimateNote}>
                {analyzingPhoto
                  ? 'Looking at your photo...'
                  : photoAnalysis?.error
                  ? photoAnalysis.message || "Couldn't analyze this photo."
                  : photoAnalysis?.issue}
              </Text>

              {!analyzingPhoto &&
              !photoAnalysis?.error &&
              photoAnalysis?.issue &&
              !problemDescription.trim() ? (
                <TouchableOpacity
                  style={styles.useAnalysisBtn}
                  onPress={() => setProblemDescription(photoAnalysis.issue)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-down-circle-outline" size={14} color={colors.accent} />
                  <Text style={styles.useAnalysisBtnText}>Use as problem description</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* AI Estimate */}
        {estimate ? (
          <View style={styles.section}>
            <View style={styles.estimateCard}>
              <View style={styles.estimateHeaderRow}>
                <Ionicons name="sparkles" size={16} color={colors.accent} />
                <Text style={styles.estimateTitle}>AI Estimate</Text>
                {estimateLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} style={{ marginLeft: 6 }} />
                ) : null}
              </View>
              <Text style={styles.estimateValue}>
                Estimated Cost: Rs. {estimate.low} – {estimate.high}
              </Text>
              <Text style={styles.estimateNote}>
                {estimateLoading
                  ? 'Refining this estimate based on your problem description...'
                  : estimate.note ||
                    'This is an AI-generated estimate. Actual price may vary depending on the provider and the problem.'}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky confirm button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity
          style={styles.confirmBtnWrap}
          onPress={handleConfirm}
          activeOpacity={0.9}
          disabled={submitting || uploadingImage}
        >
          <LinearGradient
            colors={[colors.accentGradientStart, colors.accentGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmBtnText}>
              {submitting ? 'Booking...' : uploadingImage ? 'Uploading Photo...' : 'Confirm Booking'}
            </Text>
          </LinearGradient>
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
  missingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  missingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  missingBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  missingBtnText: {
    color: colors.white,
    fontWeight: '700',
  },

  // Header
  header: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  providerMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  providerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: spacing.sm,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  providerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  providerRatingText: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },

  // Sections
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  // Service chips
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  serviceChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(31, 78, 121, 0.08)',
  },
  serviceChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  serviceChipTextActive: {
    color: colors.accent,
  },
  serviceChipPrice: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  serviceChipPriceActive: {
    color: colors.accent,
  },

  // Date cards
  dateCard: {
    width: 54,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  dateCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  dateWeekday: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  dateTextActive: {
    color: colors.white,
  },

  // Time chips
  timeChip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  timeChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeChipTextActive: {
    color: colors.white,
  },

  // Text areas
  textAreaWrap: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: {
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 48,
  },

  // Image button
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  imageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    marginLeft: 8,
  },

  // Image preview (after a photo has been picked/uploaded)
  imagePreviewWrap: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 26, 43, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadingText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageChangeBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  imageChangeBtnText: {
    color: colors.white,
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 4,
  },

  // AI Photo Analysis
  photoAnalysisCard: {
    backgroundColor: 'rgba(31, 78, 121, 0.06)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(31, 78, 121, 0.16)',
    marginTop: spacing.sm,
  },
  useAnalysisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  useAnalysisBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.accent,
    marginLeft: 5,
  },

  // AI Estimate
  estimateCard: {
    backgroundColor: 'rgba(31, 78, 121, 0.06)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(31, 78, 121, 0.16)',
  },
  estimateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimateTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.accent,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  estimateValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  estimateNote: {
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 6,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: colors.navy,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },
  confirmBtnWrap: {
    width: '100%',
  },
  confirmBtn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentGradientEnd,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
});
}