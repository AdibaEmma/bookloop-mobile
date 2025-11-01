/**
 * Create Listing Screen
 *
 * Create a new book listing for exchange/donate/borrow.
 *
 * Features:
 * - ISBN barcode scanner
 * - Manual book entry
 * - Google Books autofill
 * - Multiple photo upload
 * - Location setting
 * - Listing type and condition selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { GlassCard, GlassButton, GlassInput } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService, booksService } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';

type ListingType = 'exchange' | 'donate' | 'borrow';
type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

interface BookData {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  description?: string;
  coverImageUrl?: string;
}

export default function CreateListingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Book info
  const [isbn, setIsbn] = useState('');
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [isLoadingBook, setIsLoadingBook] = useState(false);

  // Listing details
  const [listingType, setListingType] = useState<ListingType>('exchange');
  const [condition, setCondition] = useState<Condition>('good');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Location
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const listingTypes: Array<{
    value: ListingType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
  }> = [
    {
      value: 'exchange',
      label: 'Exchange',
      icon: 'swap-horizontal',
      description: 'Swap books with others',
    },
    {
      value: 'donate',
      label: 'Donate',
      icon: 'gift',
      description: 'Give away for free',
    },
    {
      value: 'borrow',
      label: 'Borrow',
      icon: 'time',
      description: 'Lend temporarily',
    },
  ];

  const conditions: Array<{ value: Condition; label: string }> = [
    { value: 'new', label: 'Brand New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  /**
   * Get location on mount
   */
  useEffect(() => {
    getLocation();
  }, []);

  /**
   * Get user location
   */
  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Location is needed to show your listing to nearby users',
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  /**
   * Search book by ISBN
   */
  const searchBookByISBN = async () => {
    if (!isbn.trim()) {
      Alert.alert('Error', 'Please enter an ISBN');
      return;
    }

    try {
      setIsLoadingBook(true);
      const book = await booksService.searchByISBN(isbn.trim());

      if (book) {
        setBookData({
          title: book.title,
          author: book.author,
          isbn: book.isbn || isbn.trim(),
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          pageCount: book.pageCount,
          categories: book.categories,
          description: book.description,
          coverImageUrl: book.coverImageUrl,
        });
      } else {
        Alert.alert(
          'Book Not Found',
          'No book found with this ISBN. You can enter details manually.',
        );
      }
    } catch (error) {
      console.error('ISBN search error:', error);
      Alert.alert('Error', 'Failed to search for book');
    } finally {
      setIsLoadingBook(false);
    }
  };

  /**
   * Scan ISBN barcode
   */
  const scanBarcode = async () => {
    // Note: Expo barcode scanner requires expo-camera
    // For now, we'll show a placeholder
    Alert.alert(
      'ISBN Scanner',
      'Barcode scanning will be available soon. Please enter ISBN manually.',
    );
  };

  /**
   * Pick photos from library
   */
  const pickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((asset) => asset.uri);
        setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5)); // Max 5 photos
      }
    } catch (error) {
      console.error('Photo picker error:', error);
      Alert.alert('Error', 'Failed to pick photos');
    }
  };

  /**
   * Take photo with camera
   */
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 5));
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  /**
   * Remove photo
   */
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    if (!bookData?.title || !bookData?.author) {
      Alert.alert('Missing Information', 'Please add book title and author');
      return false;
    }

    if (!location) {
      Alert.alert('Location Required', 'Please enable location services');
      return false;
    }

    return true;
  };

  /**
   * Create listing
   */
  const handleCreateListing = async () => {
    if (!validateForm() || !bookData) return;

    try {
      setIsSubmitting(true);

      // First, ensure book exists in database or create it
      let bookId: string;
      if (bookData.isbn) {
        // Try to find by ISBN
        const existingBook = await booksService.searchByISBN(bookData.isbn);
        if (existingBook && existingBook.id) {
          bookId = existingBook.id;
        } else {
          // Create new book
          const newBook = await booksService.createBook(bookData);
          bookId = newBook.id;
        }
      } else {
        // Create book without ISBN
        const newBook = await booksService.createBook(bookData);
        bookId = newBook.id;
      }

      // Upload photos if any
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await Promise.all(
          photos.map(async (uri) => {
            const result = await listingsService.uploadPhoto({
              uri,
              type: 'image/jpeg',
              name: `listing-${Date.now()}.jpg`,
            });
            return result.url;
          }),
        );
      }

      // Create listing
      await listingsService.createListing({
        bookId,
        listingType,
        condition,
        description: description.trim() || undefined,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
      });

      Alert.alert('Success', 'Your listing has been created!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Create listing error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create listing',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient
          colors={
            colorScheme === 'light'
              ? [BookLoopColors.cream, BookLoopColors.lightPeach]
              : [BookLoopColors.deepBrown, BookLoopColors.charcoal]
          }
          style={StyleSheet.absoluteFillObject}
        />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
          {/* Custom Header */}
          <View style={styles.customHeader}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={BookLoopColors.burntOrange}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Create Listing
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* ISBN Search */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Find Your Book
            </Text>

            <View style={styles.isbnContainer}>
              <View style={{ flex: 1 }}>
                <GlassInput
                  value={isbn}
                  onChangeText={setIsbn}
                  placeholder="Enter ISBN"
                  keyboardType="numeric"
                  onSubmitEditing={searchBookByISBN}
                  returnKeyType="search"
                />
              </View>

              <TouchableOpacity
                onPress={scanBarcode}
                style={[
                  styles.scanButton,
                  { backgroundColor: BookLoopColors.burntOrange },
                ]}
              >
                <Ionicons name="barcode-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <GlassButton
              title="Search by ISBN"
              onPress={searchBookByISBN}
              variant="primary"
              size="md"
              loading={isLoadingBook}
              icon="search"
            />
          </GlassCard>

          {/* Book Info (if found) */}
          {bookData && (
            <GlassCard variant="lg" padding="lg">
              <View style={styles.bookInfo}>
                {bookData.coverImageUrl && (
                  <Image
                    source={{ uri: bookData.coverImageUrl }}
                    style={styles.bookCover}
                  />
                )}

                <View style={styles.bookDetails}>
                  <Text style={[styles.bookTitle, { color: colors.text }]}>
                    {bookData.title}
                  </Text>
                  <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>
                    by {bookData.author}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setBookData(null)}
                    style={styles.changeButton}
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={BookLoopColors.burntOrange}
                    />
                    <Text
                      style={[
                        styles.changeText,
                        { color: BookLoopColors.burntOrange },
                      ]}
                    >
                      Change Book
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Manual Entry */}
          {!bookData && (
            <GlassCard variant="lg" padding="lg">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Or Enter Manually
              </Text>

              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Title *
                </Text>
                <GlassInput
                  value={bookData?.title || ''}
                  onChangeText={(text) =>
                    setBookData((prev) => ({ ...prev!, title: text }))
                  }
                  placeholder="Book title"
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Author *
                </Text>
                <GlassInput
                  value={bookData?.author || ''}
                  onChangeText={(text) =>
                    setBookData((prev) => ({ ...prev!, author: text }))
                  }
                  placeholder="Author name"
                />
              </View>
            </GlassCard>
          )}

          {/* Listing Type */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Listing Type
            </Text>

            <View style={styles.typeContainer}>
              {listingTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setListingType(type.value)}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor:
                        listingType === type.value
                          ? BookLoopColors.burntOrange
                          : colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name={type.icon}
                    size={32}
                    color={listingType === type.value ? '#FFFFFF' : colors.text}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      {
                        color:
                          listingType === type.value ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text
                    style={[
                      styles.typeDescription,
                      {
                        color:
                          listingType === type.value
                            ? 'rgba(255, 255, 255, 0.8)'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* Condition */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Condition
            </Text>

            <View style={styles.conditionContainer}>
              {conditions.map((cond) => (
                <TouchableOpacity
                  key={cond.value}
                  onPress={() => setCondition(cond.value)}
                  style={[
                    styles.conditionChip,
                    {
                      backgroundColor:
                        condition === cond.value
                          ? BookLoopColors.burntOrange
                          : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.conditionText,
                      {
                        color:
                          condition === cond.value ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    {cond.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* Photos */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Photos (Optional)
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Add up to 5 photos of your book
            </Text>

            <View style={styles.photosContainer}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity
                    onPress={() => removePhoto(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}

              {photos.length < 5 && (
                <View style={styles.addPhotoButtons}>
                  <TouchableOpacity
                    onPress={takePhoto}
                    style={[
                      styles.addPhotoButton,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Ionicons
                      name="camera"
                      size={32}
                      color={BookLoopColors.burntOrange}
                    />
                    <Text style={[styles.addPhotoText, { color: colors.text }]}>
                      Camera
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={pickPhotos}
                    style={[
                      styles.addPhotoButton,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Ionicons
                      name="images"
                      size={32}
                      color={BookLoopColors.burntOrange}
                    />
                    <Text style={[styles.addPhotoText, { color: colors.text }]}>
                      Gallery
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </GlassCard>

          {/* Description */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Description (Optional)
            </Text>

            <GlassInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add any additional details..."
              multiline
              numberOfLines={4}
              style={{ height: 100 }}
            />
          </GlassCard>

          {/* Create Button */}
          <GlassButton
            title="Create Listing"
            onPress={handleCreateListing}
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting || !bookData}
            icon="add-circle"
            style={styles.createButton}
          />
        </ScrollView>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.md,
  },
  isbnContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  bookCover: {
    width: 80,
    height: 120,
    borderRadius: 8,
  },
  bookDetails: {
    flex: 1,
  },
  bookTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  changeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  formField: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  typeCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  typeDescription: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
  },
  conditionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  conditionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  conditionText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPhotoButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  addPhotoText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  createButton: {
    marginBottom: Spacing['2xl'],
  },
});
