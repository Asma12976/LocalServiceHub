// src/screens/provider/ProviderProfileSetupScreen.js
// Provider business profile setup / edit screen.
// UI redesigned only — existing Firebase, Cloudinary, validation,
// navigation and ProviderContext functionality remains unchanged.

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

import { spacing, radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useProvider } from '../../context/ProviderContext';
import { useUser } from '../../context/UserContext';
import { categories } from '../../data/mockData';
import InputField from '../../components/InputField';
import GradientButton from '../../components/GradientButton';
import { validateRequired, validatePhone } from '../../utils/validation';
import { generateServiceDescription, analyzePhotoQuality } from '../../services/aiService';
import { getCurrentCoords } from '../../utils/location';

const emptyServiceRow = () => ({
  id: `svc-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  name: '',
  price: '',
  duration: '',
});

export default function ProviderProfileSetupScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const {
    providerProfile,
    loading,
    saveProviderProfile,
    uploadProviderPhoto,
  } = useProvider();

  const { user } = useUser();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [about, setAbout] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [location, setLocation] = useState('');
  // Real GPS pin, separate from the free-text "location" field above.
  // This is what NearMeScreen's map + real distance calculation actually
  // use (src/utils/location.js) — the text field is just a human-readable
  // label shown on cards, it was never enough on its own to plot a point.
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [phone, setPhone] = useState('');
  const [available, setAvailable] = useState(true);
  const [image, setImage] = useState('');
  const [services, setServices] = useState([emptyServiceRow()]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [photoQuality, setPhotoQuality] = useState(null);
  const [checkingPhotoQuality, setCheckingPhotoQuality] = useState(false);

  useEffect(() => {
    if (!providerProfile) {
      // First time setting up a profile — pre-fill the contact number with
      // the phone number they signed up with, so "call" already works with
      // their own real number even before they've touched this screen.
      setPhone(user?.phone || '');
      return;
    }

    setName(providerProfile.name || '');
    setCategoryId(providerProfile.categoryId || null);
    setAbout(providerProfile.about || '');

    setExperienceYears(
      providerProfile.experienceYears != null
        ? String(providerProfile.experienceYears)
        : ''
    );

    setLocation(providerProfile.location || '');
    setLatitude(typeof providerProfile.latitude === 'number' ? providerProfile.latitude : null);
    setLongitude(typeof providerProfile.longitude === 'number' ? providerProfile.longitude : null);
    setPhone(providerProfile.phone || user?.phone || '');
    setAvailable(providerProfile.available ?? true);
    setImage(providerProfile.image || '');

    if (providerProfile.services?.length) {
      setServices(providerProfile.services);
    }
  }, [providerProfile, user?.phone]);

  const businessInitial = (name.trim().charAt(0) || '?').toUpperCase();

  // ===================================================
  // SERVICES
  // ===================================================

  const updateServiceField = (id, field, value) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    );
  };

  const addServiceRow = () => {
    setServices((prev) => [...prev, emptyServiceRow()]);
  };

  const removeServiceRow = (id) => {
    setServices((prev) =>
      prev.length > 1
        ? prev.filter((s) => s.id !== id)
        : prev
    );
  };

  // ===================================================
  // PHOTO UPLOAD
  // ===================================================

  // Fire-and-forget check that runs after the business photo finishes
  // uploading — never blocks saving the profile. See analyzePhotoQuality()
  // in src/services/aiService.js.
  const checkPhotoQuality = async (uploadedURL) => {
    setCheckingPhotoQuality(true);
    setPhotoQuality(null);

    try {
      const result = await analyzePhotoQuality({
        photoUrl: uploadedURL,
        context: 'business',
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
        permissionResult =
          await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
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

      if (
        result.canceled ||
        !result.assets ||
        !result.assets.length
      ) {
        return;
      }

      const localUri = result.assets[0].uri;

      setImage(localUri);
      setUploadingPhoto(true);

      const uploadedURL =
        await uploadProviderPhoto(localUri);

      setImage(uploadedURL);

      // Let the AI quality check run in the background.
      checkPhotoQuality(uploadedURL);
    } catch (err) {
      Alert.alert(
        'Upload Failed',
        err?.message ||
          'Could not update your photo. Try again.'
      );

      setImage(providerProfile?.image || '');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert('Business Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: () => pickAndUpload('camera'),
      },
      {
        text: 'Choose from Gallery',
        onPress: () => pickAndUpload('gallery'),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  // ===================================================
  // AI DESCRIPTION GENERATOR
  // ===================================================

  const handleGenerateDescription = async () => {
    if (!name.trim() || !categoryId) {
      Alert.alert(
        'More Info Needed',
        'Please enter your business name and select a category first so AI can write a relevant description.'
      );
      return;
    }

    setGeneratingDescription(true);

    try {
      const categoryName =
        categories.find((c) => c.id === categoryId)?.name || '';

      const serviceNames = services
        .map((s) => s.name.trim())
        .filter(Boolean);

      const result = await generateServiceDescription({
        businessName: name.trim(),
        categoryName,
        experienceYears,
        location,
        serviceNames,
      });

      if (result.error || !result.description) {
        Alert.alert(
          'Generation Failed',
          result.message ||
            "Couldn't generate a description right now. Please try again."
        );
        return;
      }

      setAbout(result.description);
    } catch (err) {
      Alert.alert(
        'Generation Failed',
        err?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setGeneratingDescription(false);
    }
  };

  // ===================================================
  // SAVE
  // ===================================================

  const validate = () => {
    const newErrors = {
      name: validateRequired(name, 'Business name'),
      categoryId: categoryId
        ? null
        : 'Please select a category',
      location: validateRequired(location, 'Location'),
      phone: validatePhone(phone),
      about: validateRequired(about, 'About'),
    };

    setErrors(newErrors);

    return Object.values(newErrors).every((e) => !e);
  };

  // ===================================================
  // GPS PIN — "Use my current location"
  // ===================================================

  const handleUseCurrentLocation = async () => {
    setLocatingGPS(true);
    try {
      const result = await getCurrentCoords();
      if (!result.isReal) {
        Alert.alert(
          'Location Unavailable',
          "Couldn't access your device's GPS. Please allow location permission for Local Service Hub in your phone's settings and try again."
        );
        return;
      }
      setLatitude(result.coords.latitude);
      setLongitude(result.coords.longitude);
      Alert.alert('Location Saved', 'Your current GPS position will be shown on the map when you save.');
    } catch (err) {
      Alert.alert('Location Unavailable', err?.message || 'Could not read your current location.');
    } finally {
      setLocatingGPS(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    const cleanedServices = services
      .filter((s) => s.name.trim())
      .map((s) => ({
        id: s.id,
        name: s.name.trim(),
        price: Number(s.price) || 0,
        duration: s.duration.trim(),
      }));

    if (cleanedServices.length === 0) {
      Alert.alert(
        'Add a Service',
        'Please add at least one service you offer.'
      );
      return;
    }

    setSaving(true);

    try {
      await saveProviderProfile({
        name: name.trim(),
        categoryId,
        about: about.trim(),
        experienceYears: Number(experienceYears) || 0,
        location: location.trim(),
        ...(typeof latitude === 'number' && typeof longitude === 'number'
          ? { latitude, longitude }
          : {}),
        phone: phone.trim(),
        available,
        services: cleanedServices,
        image,
      });

      Alert.alert(
        'Profile Saved',
        'Your business profile has been saved successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        'Save Failed',
        err?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          color={colors.accent}
          size="large"
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <View style={styles.header}>
          <LinearGradient
            colors={[colors.navy, colors.navySoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.headerGradient,
              { paddingTop: insets.top + 14 },
            ]}
          >
            <View
              style={styles.decorCircleBig}
              pointerEvents="none"
            />

            <View
              style={styles.decorCircleSmall}
              pointerEvents="none"
            />

            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                hitSlop={8}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="chevron-back"
                  size={21}
                  color={colors.white}
                />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                
                

                <View style={styles.headerTextWrap}>
                  <Text style={styles.headerLabel}>
                    My Business Profile
                  </Text>
                </View>
              </View>

              <View style={styles.headerPlaceholder} />
            </View>
          </LinearGradient>
        </View>

        {/* ===================================================
            BUSINESS PHOTO
        =================================================== */}

        <View style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            {image ? (
              <Image
                source={{ uri: image }}
                style={styles.avatarImage}
              />
            ) : (
              <LinearGradient
                colors={[
                  colors.accentGradientStart,
                  colors.accentGradientEnd,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {businessInitial}
                </Text>
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
              activeOpacity={0.8}
            >
              <Ionicons
                name="camera"
                size={13}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.photoTextWrap}>
            <Text style={styles.photoTitle}>
              Business Photo
            </Text>

            <TouchableOpacity
              onPress={handleChangePhoto}
              disabled={uploadingPhoto}
            >
              <Text style={styles.avatarHint}>
                {uploadingPhoto
                  ? 'Uploading photo...'
                  : 'Add a professional photo of your business'}
              </Text>
            </TouchableOpacity>

            {!uploadingPhoto && (checkingPhotoQuality || photoQuality) ? (
              <View style={styles.photoQualityRow}>
                {checkingPhotoQuality ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.accent}
                  />
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
        </View>

        {/* ===================================================
            BUSINESS DETAILS
        =================================================== */}

        <View style={styles.formCard}>
          <View style={styles.sectionHeadingRow}>
            <View style={styles.sectionIcon}>
              <Ionicons
                name="business-outline"
                size={17}
                color={colors.accent}
              />
            </View>

            <Text style={styles.sectionTitleMain}>
              Business Details
            </Text>
          </View>

          <InputField
            label="Business / Service Name"
            icon="briefcase-outline"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ahmed Electric Services"
            autoCapitalize="words"
            error={errors.name}
          />

          {/* ===================================================
              CATEGORY
          =================================================== */}

          <View style={styles.categoryHeader}>
            <View>
              <Text style={styles.label}>Service Category</Text>
              <Text style={styles.fieldHint}>
                Choose the category that best describes your work
              </Text>
            </View>

            <View style={styles.categoryCount}>
              <Text style={styles.categoryCountText}>
                {categories.length}
              </Text>
            </View>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.map((cat) => {
              const active = categoryId === cat.id;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    active && styles.categoryCardActive,
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                  activeOpacity={0.82}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      active &&
                        styles.categoryIconActive,
                    ]}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={20}
                      color={
                        active
                          ? colors.white
                          : colors.accent
                      }
                    />
                  </View>

                  <Text
                    numberOfLines={2}
                    style={[
                      styles.categoryText,
                      active &&
                        styles.categoryTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>

                  {active ? (
                    <View style={styles.categorySelected}>
                      <Ionicons
                        name="checkmark"
                        size={11}
                        color={colors.white}
                      />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {errors.categoryId ? (
            <Text style={styles.errorText}>
              {errors.categoryId}
            </Text>
          ) : null}

          {/* ABOUT */}

          <View style={styles.fieldBlock}>
            <View style={styles.aboutLabelRow}>
              <Text style={styles.label}>
                About Your Business
              </Text>

              <TouchableOpacity
                style={[
                  styles.aiGenerateBtn,
                  generatingDescription &&
                    styles.aiGenerateBtnDisabled,
                ]}
                onPress={handleGenerateDescription}
                disabled={generatingDescription}
                activeOpacity={0.8}
              >
                {generatingDescription ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.accent}
                  />
                ) : (
                  <Ionicons
                    name="sparkles"
                    size={13}
                    color={colors.accent}
                  />
                )}

                <Text style={styles.aiGenerateBtnText}>
                  {generatingDescription
                    ? 'Generating...'
                    : 'Generate with AI'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.textAreaWrap}>
              <Ionicons
                name="document-text-outline"
                size={17}
                color={colors.placeholder}
                style={styles.textAreaIcon}
              />

              <TextInput
                style={styles.textArea}
                value={about}
                onChangeText={setAbout}
                placeholder="Briefly describe your experience and what makes your service reliable..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {errors.about ? (
              <Text style={styles.errorText}>
                {errors.about}
              </Text>
            ) : null}
          </View>

          <InputField
            label="Experience (years)"
            icon="ribbon-outline"
            value={experienceYears}
            onChangeText={setExperienceYears}
            placeholder="e.g. 5"
            keyboardType="number-pad"
          />

          <InputField
            label="Location / Area"
            icon="location-outline"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. G-9, Islamabad"
            autoCapitalize="words"
            error={errors.location}
          />

          {/* Real GPS pin for the map / "Near Me" distance calculation —
              separate from the free-text area name above. */}
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={handleUseCurrentLocation}
            activeOpacity={0.85}
            disabled={locatingGPS}
          >
            {locatingGPS ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="navigate-outline" size={16} color={colors.accent} />
            )}
            <Text style={styles.gpsBtnText}>
              {typeof latitude === 'number'
                ? `Pin set (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) — tap to update`
                : 'Use my current location for the map'}
            </Text>
          </TouchableOpacity>

          <InputField
            label="Contact Phone Number"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 03001234567"
            keyboardType="phone-pad"
            error={errors.phone}
          />
          <Text style={[styles.fieldHint, { marginTop: -6, marginBottom: spacing.sm }]}>
            Customers will call this number when they book your services.
          </Text>

          {/* ===================================================
              AVAILABILITY
          =================================================== */}

          <View style={styles.availabilityHeader}>
            <View>
              <Text style={styles.label}>
                Availability
              </Text>
              <Text style={styles.fieldHint}>
                Let customers know if you are currently accepting work
              </Text>
            </View>

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: available
                    ? colors.success
                    : colors.error,
                },
              ]}
            />
          </View>

          <View style={styles.availabilityRow}>
            <TouchableOpacity
              style={[
                styles.availabilityBtn,
                available &&
                  styles.availabilityBtnActive,
              ]}
              onPress={() => setAvailable(true)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="checkmark-circle"
                size={19}
                color={
                  available
                    ? colors.white
                    : colors.success
                }
              />

              <View style={styles.availabilityTextWrap}>
                <Text
                  style={[
                    styles.availabilityText,
                    available &&
                      styles.availabilityTextActive,
                  ]}
                >
                  Available Now
                </Text>

                <Text
                  style={[
                    styles.availabilitySubText,
                    available &&
                      styles.availabilitySubTextActive,
                  ]}
                >
                  Accepting requests
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.availabilityBtn,
                styles.availabilityBtnBusy,
                !available &&
                  styles.availabilityBtnBusyActive,
              ]}
              onPress={() => setAvailable(false)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="time-outline"
                size={19}
                color={
                  !available
                    ? colors.white
                    : colors.error
                }
              />

              <View style={styles.availabilityTextWrap}>
                <Text
                  style={[
                    styles.availabilityText,
                    !available &&
                      styles.availabilityTextActive,
                  ]}
                >
                  Currently Busy
                </Text>

                <Text
                  style={[
                    styles.availabilitySubText,
                    !available &&
                      styles.availabilitySubTextActive,
                  ]}
                >
                  Not accepting requests
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===================================================
            SERVICES
        =================================================== */}

        <View style={styles.formCard}>
          <View style={styles.servicesHeaderRow}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="list-outline"
                  size={17}
                  color={colors.accent}
                />
              </View>

              <View>
                <Text style={styles.sectionTitleMain}>
                  Services You Offer
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Add your services, pricing and duration
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={addServiceRow}
              style={styles.addServiceBtn}
              hitSlop={8}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add"
                size={20}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.servicesCountBadge}>
            <Ionicons
              name="briefcase-outline"
              size={13}
              color={colors.accent}
            />

            <Text style={styles.servicesCountText}>
              {services.length}{' '}
              {services.length === 1
                ? 'service'
                : 'services'}
            </Text>
          </View>

          {services.map((service, index) => (
            <View
              key={service.id}
              style={styles.serviceRow}
            >
              {/* Service Header */}

              <View style={styles.serviceRowTop}>
                <View style={styles.serviceNumber}>
                  <Text style={styles.serviceNumberText}>
                    {index + 1}
                  </Text>
                </View>

                <Text style={styles.serviceIndex}>
                  SERVICE {index + 1}
                </Text>

                <View style={styles.serviceTopSpacer} />

                {services.length > 1 ? (
                  <TouchableOpacity
                    onPress={() =>
                      removeServiceRow(service.id)
                    }
                    hitSlop={8}
                    style={styles.deleteServiceBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Service Name */}

              <Text style={styles.inputLabel}>
                Service Name
              </Text>

              <View style={styles.serviceInputWrap}>
                <Ionicons
                  name="construct-outline"
                  size={17}
                  color={colors.placeholder}
                />

                <TextInput
                  style={styles.serviceInput}
                  value={service.name}
                  onChangeText={(t) =>
                    updateServiceField(
                      service.id,
                      'name',
                      t
                    )
                  }
                  placeholder="e.g. Fan Repair"
                  placeholderTextColor={
                    colors.placeholder
                  }
                />
              </View>

              {/* Price + Duration */}

              <View style={styles.serviceRowBottom}>
                <View
                  style={[
                    styles.serviceInputSmallWrap,
                    { marginRight: spacing.sm },
                  ]}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={colors.placeholder}
                  />

                  <TextInput
                    style={styles.serviceInputSmall}
                    value={String(service.price)}
                    onChangeText={(t) =>
                      updateServiceField(
                        service.id,
                        'price',
                        t
                      )
                    }
                    placeholder="Price (Rs.)"
                    placeholderTextColor={
                      colors.placeholder
                    }
                    keyboardType="number-pad"
                  />
                </View>

                <View
                  style={styles.serviceInputSmallWrap}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={colors.placeholder}
                  />

                  <TextInput
                    style={styles.serviceInputSmall}
                    value={service.duration}
                    onChangeText={(t) =>
                      updateServiceField(
                        service.id,
                        'duration',
                        t
                      )
                    }
                    placeholder="Duration"
                    placeholderTextColor={
                      colors.placeholder
                    }
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Add another */}

          <TouchableOpacity
            style={styles.addServiceRowBtn}
            onPress={addServiceRow}
            activeOpacity={0.82}
          >
            <View style={styles.addServiceIcon}>
              <Ionicons
                name="add"
                size={17}
                color={colors.accent}
              />
            </View>

            <View style={styles.addServiceTextWrap}>
              <Text style={styles.addServiceRowText}>
                Add Another Service
              </Text>

              <Text style={styles.addServiceSubText}>
                Add more services you provide
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>

        {/* ===================================================
            SAVE / CANCEL
        =================================================== */}

        <View style={styles.formCard}>
          <View style={styles.saveInfo}>
            <View style={styles.saveInfoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={colors.accent}
              />
            </View>

            <Text style={styles.saveInfoText}>
              Your business information will be securely saved to your profile.
            </Text>
          </View>

          <GradientButton
            title="Save Business Profile"
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

  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginTop: -6,
    marginBottom: spacing.md,
  },
  gpsBtnText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },

  headerGradient: {
    height: 138,
    paddingHorizontal: spacing.lg,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  headerPlaceholder: {
    width: 36,
    height: 36,
  },

  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },

  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 120, 136, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 120, 136, 0.40)',
  },

  headerTextWrap: {
    justifyContent: 'center',
  },

  headerLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  decorCircleBig: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -76,
    right: -48,
  },

  decorCircleSmall: {
    position: 'absolute',
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -34,
    left: 28,
  },

  // ===================================================
  // PHOTO
  // ===================================================

  avatarCard: {
    marginTop: -50,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingTop: 8,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 5,
  },

  avatarWrap: {
    marginTop: -42,
    position: 'relative',
  },

  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
  },

  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 4,
    borderColor: colors.surface,
  },

  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(7, 26, 43, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: colors.white,
    fontSize: 31,
    fontWeight: '800',
  },

  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: -1,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },

  photoTextWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  photoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  avatarHint: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 3,
    textAlign: 'center',
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

  // ===================================================
  // FORM CARD
  // ===================================================

  formCard: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },

  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 14,
  },

  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 120, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  sectionTitleMain: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  sectionSubtitle: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
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

  // ===================================================
  // LABELS
  // ===================================================

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 5,
  },

  fieldHint: {
    fontSize: 10.5,
    color: colors.textSecondary,
    lineHeight: 15,
  },

  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },

  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginBottom: spacing.md,
    marginLeft: 2,
  },

  fieldBlock: {
    marginTop: 4,
  },

  // ===================================================
  // AI DESCRIPTION GENERATOR
  // ===================================================

  aboutLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  aiGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 120, 136, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74, 120, 136, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  aiGenerateBtnDisabled: {
    opacity: 0.7,
  },

  aiGenerateBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.accent,
    marginLeft: 5,
  },

  // ===================================================
  // CATEGORY
  // ===================================================

  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    marginBottom: 12,
  },

  categoryCount: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 120, 136, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
  },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  categoryCard: {
    width: '48.5%',
    minHeight: 66,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },

  categoryCardActive: {
    backgroundColor: 'rgba(74, 120, 136, 0.10)',
    borderColor: colors.accent,
    borderWidth: 1.5,
  },

  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(74, 120, 136, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  categoryIconActive: {
    backgroundColor: colors.accent,
  },

  categoryText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingRight: 2,
  },

  categoryTextActive: {
    color: colors.textPrimary,
    fontWeight: '800',
  },

  categorySelected: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===================================================
  // TEXT AREA
  // ===================================================

  textAreaWrap: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    minHeight: 105,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 12,
    marginBottom: spacing.sm,
  },

  textAreaIcon: {
    marginTop: 2,
    marginRight: 8,
  },

  textArea: {
    flex: 1,
    padding: 0,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textPrimary,
    minHeight: 82,
    textAlignVertical: 'top',
  },

  // ===================================================
  // AVAILABILITY
  // ===================================================

  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    marginBottom: 10,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 3,
  },

  availabilityRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },

  availabilityBtn: {
    flex: 1,
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: colors.success,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },

  availabilityBtnActive: {
    backgroundColor: colors.success,
  },

  availabilityBtnBusy: {
    borderColor: colors.error,
    marginRight: 0,
  },

  availabilityBtnBusyActive: {
    backgroundColor: colors.error,
  },

  availabilityTextWrap: {
    flex: 1,
    marginLeft: 8,
  },

  availabilityText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },

  availabilityTextActive: {
    color: colors.white,
  },

  availabilitySubText: {
    fontSize: 9.5,
    color: colors.textSecondary,
    marginTop: 3,
  },

  availabilitySubTextActive: {
    color: 'rgba(255,255,255,0.78)',
  },

  // ===================================================
  // SERVICES
  // ===================================================

  servicesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  addServiceBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  servicesCountBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 120, 136, 0.09)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },

  servicesCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.accent,
    marginLeft: 5,
  },

  serviceRow: {
    backgroundColor: 'rgba(31, 78, 121, 0.045)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(31, 78, 121, 0.12)',
    padding: 11,
    marginBottom: 11,
  },

  serviceRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },

  serviceNumber: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  serviceNumberText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },

  serviceIndex: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  serviceTopSpacer: {
    flex: 1,
  },

  deleteServiceBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(200, 60, 60, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceInputWrap: {
    minHeight: 45,
    borderWidth: 1.3,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    marginBottom: 9,
  },

  serviceInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },

  serviceRowBottom: {
    flexDirection: 'row',
  },

  serviceInputSmallWrap: {
    flex: 1,
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.3,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
  },

  serviceInputSmall: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    paddingVertical: 9,
    paddingHorizontal: 6,
  },

  addServiceRowBtn: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: 13,
    paddingHorizontal: 12,
  },

  addServiceIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 120, 136, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addServiceTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  addServiceRowText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.accent,
  },

  addServiceSubText: {
    fontSize: 9.8,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ===================================================
  // SAVE
  // ===================================================

  saveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 120, 136, 0.07)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 4,
  },

  saveInfoIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(74, 120, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  saveInfoText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.textSecondary,
  },

  saveBtn: {
    marginTop: spacing.md,
  },

  cancelBtn: {
    marginTop: spacing.sm,
  },
});
}