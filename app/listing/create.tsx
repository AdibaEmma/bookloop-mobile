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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { GlassCard, GlassButton, GlassInput } from '@/components/ui';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { BookSearchCreate } from '@/components/BookSearchCreate';
import { QuickBookSearch } from '@/components/QuickBookSearch';
import { useAuth } from '@/contexts/AuthContext';
import { listingsService, booksService, Book } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  Spacing,
  BookLoopColors,
} from '@/constants/theme';
import { showErrorAlert, showSuccessAlert, showWarningAlert } from '@/components/ui/AlertManager';

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
  coverImage?: string;
}

export default function CreateListingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();

  // Book info
  const [isbn, setIsbn] = useState('');
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null); // Store full book with ID
  const [isLoadingBook, setIsLoadingBook] = useState(false);

  // Manual entry fields
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');

  // User's existing books
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [isLoadingMyBooks, setIsLoadingMyBooks] = useState(false);
  const [showMyBooks, setShowMyBooks] = useState(false);

  // Listing details
  const [listingType, setListingType] = useState<ListingType>('exchange');
  const [condition, setCondition] = useState<Condition>('good');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [publishImmediately, setPublishImmediately] = useState(true);

  // Location
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    region: string;
  } | null>(null);

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);

  // Exchange preferences state
  const [exchangePreferences, setExchangePreferences] = useState<Array<Book & { priority: number }>>([]);
  const [showPreferenceSelector, setShowPreferenceSelector] = useState(false);

  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

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
   * Get location on mount and load user's books
   */
  useEffect(() => {
    getLocation();
    loadMyBooks();
  }, []);

  /**
   * Load user's existing books
   */
  const loadMyBooks = async () => {
    try {
      setIsLoadingMyBooks(true);
      const books = await booksService.getMyBooks();
      setMyBooks(books);
    } catch (error) {
      console.error('Failed to load my books:', error);
      // Silently fail - not critical
    } finally {
      setIsLoadingMyBooks(false);
    }
  };

  /**
   * Get user location
   */
  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showWarningAlert(
          'Location is needed to show your listing to nearby users',
          'Location Required'
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          address: `${address.street || ''} ${address.streetNumber || ''}`.trim() || 'Address not available',
          city: address.city || address.subregion || 'Unknown City',
          region: address.region || address.country || 'Unknown Region',
        });
      } else {
        // Fallback if geocoding fails
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          address: 'Address not available',
          city: 'Unknown City',
          region: 'Unknown Region',
        });
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  /**
   * Search book by ISBN
   */
  const searchBookByISBN = async () => {
    if (!isbn.trim()) {
      showErrorAlert('Please enter an ISBN', 'Missing ISBN');
      return;
    }

    try {
      setIsLoadingBook(true);
      const book = await booksService.searchByISBN(isbn.trim());

      if (book) {
        // Store full book object with ID
        setSelectedBook(book);
        setBookData({
          title: book.title,
          author: book.author,
          isbn: book.isbn || isbn.trim(),
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          pageCount: book.pageCount,
          categories: book.categories,
          description: book.description,
          coverImage: book.coverImage,
        });
        showSuccessAlert(`Found: ${book.title}`, 'Book Found');
      } else {
        showWarningAlert(
          'No book found with this ISBN. You can enter book details manually below.',
          'Book Not Found'
        );
        // Pre-fill ISBN in case user wants to add manually
        setSelectedBook(null);
        setManualTitle('');
        setManualAuthor('');
      }
    } catch (error: any) {
      console.error('ISBN search error:', error);
      showErrorAlert(
        error.response?.data?.message || 'Failed to search for book. Please try again or enter details manually.',
        'Search Failed'
      );
    } finally {
      setIsLoadingBook(false);
    }
  };

  /**
   * Scan ISBN barcode
   */
  const scanBarcode = () => {
    setShowScanner(true);
  };

  /**
   * Handle scanned ISBN
   */
  const handleScannedISBN = async (scannedISBN: string) => {
    console.log('ISBN scanned in create listing:', scannedISBN);
    setIsbn(scannedISBN);

    // Automatically search for the book
    try {
      setIsLoadingBook(true);
      console.log('Searching for ISBN:', scannedISBN);

      const book = await booksService.searchByISBN(scannedISBN);

      console.log('Search result:', book);

      if (book) {
        // Store full book object with ID
        setSelectedBook(book);
        setBookData({
          title: book.title,
          author: book.author,
          isbn: book.isbn || scannedISBN,
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          pageCount: book.pageCount,
          categories: book.categories,
          description: book.description,
          coverImage: book.coverImage,
        });
        setShowScanner(false); // Close scanner after successful search
        showSuccessAlert(`Found: ${book.title} by ${book.author}`, 'Book Found!');
      } else {
        console.log('No book found for ISBN:', scannedISBN);
        setShowScanner(false); // Close scanner
        showWarningAlert(
          `ISBN ${scannedISBN} was scanned successfully, but we couldn't find book information. You can enter the details manually below.`,
          'Book Not Found'
        );
        // Keep the ISBN in the field so user can reference it
      }
    } catch (error: any) {
      console.error('ISBN search error:', error);
      setShowScanner(false); // Close scanner on error

      // Provide more specific error messages
      if (error.response?.status === 404) {
        showWarningAlert(
          `ISBN ${scannedISBN} was scanned successfully, but we couldn't find this book in our database or Google Books. You can add it manually below.`,
          'Book Not Found'
        );
      } else if (error.response?.status === 400) {
        showErrorAlert(
          'The ISBN format appears to be invalid. Please check the barcode and try again, or enter details manually.',
          'Invalid ISBN'
        );
      } else {
        showErrorAlert(
          error.response?.data?.message || 'Failed to search for book. Please check your internet connection and try again, or enter details manually.',
          'Search Failed'
        );
      }
    } finally {
      setIsLoadingBook(false);
    }
  };

  /**
   * Pick photos from library
   */
  const pickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        showWarningAlert(
          'Please allow access to your photo library',
          'Permission Required'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
      showErrorAlert('Failed to pick photos', 'Error');
    }
  };

  /**
   * Take photo with camera
   */
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        showWarningAlert('Please allow camera access', 'Permission Required');
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
      showErrorAlert('Failed to take photo', 'Error');
    }
  };

  /**
   * Remove photo
   */
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Use manual entry to create bookData
   */
  const useManualEntry = () => {
    if (!manualTitle.trim() || !manualAuthor.trim()) {
      showWarningAlert('Please enter both title and author', 'Missing Information');
      return;
    }

    // Clear selectedBook since this is manual entry
    setSelectedBook(null);
    setBookData({
      title: manualTitle.trim(),
      author: manualAuthor.trim(),
    });
    showSuccessAlert('Book details saved', 'Success');
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    // If manual entry is being used, create bookData first
    if (!bookData && (manualTitle.trim() || manualAuthor.trim())) {
      if (!manualTitle.trim() || !manualAuthor.trim()) {
        showWarningAlert('Please enter both title and author', 'Missing Information');
        return false;
      }
      setBookData({
        title: manualTitle.trim(),
        author: manualAuthor.trim(),
      });
      return false; // Will need to submit again after bookData is set
    }

    if (!bookData?.title || !bookData?.author) {
      showWarningAlert('Please add book title and author', 'Missing Information');
      return false;
    }

    if (!location) {
      showWarningAlert('Please enable location services', 'Location Required');
      return false;
    }

    return true;
  };

  /**
   * Validate current step
   */
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Book Selection
        if (!bookData) {
          showWarningAlert('Please select or enter a book before continuing', 'Missing Book Information');
          return false;
        }
        return true;

      case 2: // Listing Type & Condition
        // Always valid - has defaults
        return true;

      case 3: // Details & Location
        if (!location) {
          showWarningAlert('Please enable location services', 'Location Required');
          return false;
        }
        return true;

      case 4: // Review & Publish
        // Final validation
        return validateForm();

      default:
        return true;
    }
  };

  /**
   * Navigate to next step
   */
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  /**
   * Navigate to previous step
   */
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Get step title
   */
  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1:
        return 'Select Your Book';
      case 2:
        return 'Listing Details';
      case 3:
        return 'Photos & Location';
      case 4:
        return 'Review & Publish';
      default:
        return 'Create Listing';
    }
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

      // Use selectedBook if available (from ISBN search/scan) to avoid duplicate API calls
      if (selectedBook && selectedBook.id) {
        bookId = selectedBook.id;
      } else if (bookData.isbn) {
        // Only search by ISBN if we don't already have the book
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

      // Create listing (without photos first)
      const listing = await listingsService.createListing({
        bookId,
        listingType,
        condition,
        description: description.trim() || undefined,
        latitude: location!.latitude,
        longitude: location!.longitude,
        address: location!.address,
        city: location!.city,
        region: location!.region,
        status: publishImmediately ? 'available' : 'draft',
      });

      // Upload photos after creating listing
      if (photos.length > 0) {
        try {
          const photoFiles = photos.map((uri, index) => ({
            uri,
            type: 'image/jpeg',
            name: `listing-${listing.id}-${index}.jpg`,
          }));

          await listingsService.uploadImages(listing.id, photoFiles);
        } catch (uploadError: any) {
          // If photo upload fails, warn but don't fail the listing creation
          console.warn('Photo upload failed:', uploadError);
          showWarningAlert(
            'Your listing was created but photos could not be uploaded. You can add them later.',
            'Listing Created'
          );
        }
      }

      // Add exchange preferences if listing type is exchange
      if (listingType === 'exchange' && exchangePreferences.length > 0) {
        try {
          for (const preference of exchangePreferences) {
            await listingsService.addPreference(
              listing.id,
              preference.id,
              preference.priority
            );
          }
        } catch (preferenceError: any) {
          // Warn but don't fail the listing creation
          console.warn('Failed to add preferences:', preferenceError);
          showWarningAlert(
            'Your listing was created but preferences could not be saved. You can add them later.',
            'Listing Created'
          );
        }
      }

      // Use Alert.alert for success with navigation callback
      const statusMessage = publishImmediately
        ? 'Your listing has been published and is now visible to all users!'
        : 'Your listing has been saved as a draft. You can publish it later from your listings.';

      Alert.alert(
        publishImmediately ? 'Listing Published!' : 'Listing Saved as Draft',
        statusMessage,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Create listing error:', error);
      showErrorAlert(
        error.response?.data?.message || 'Failed to create listing',
        'Creation Failed'
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

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScannedISBN}
      />

      {/* Quick Book Search Bottom Sheet */}
      <QuickBookSearch
        visible={showPreferenceSelector}
        onClose={() => setShowPreferenceSelector(false)}
        onConfirm={(books) => {
          // Merge new books with existing preferences
          const startPriority = exchangePreferences.length;
          const newPreferences = books.map((book, index) => ({
            ...book,
            priority: startPriority + index + 1,
          }));

          // Check for duplicates and filter them out
          const existingIds = new Set(exchangePreferences.map(b => b.id));
          const uniqueNewBooks = newPreferences.filter(b => !existingIds.has(b.id));

          setExchangePreferences([...exchangePreferences, ...uniqueNewBooks]);
          setShowPreferenceSelector(false);
        }}
        existingBookIds={exchangePreferences.map(b => b.id)}
        maxBooks={user?.subscriptionTier === 'premium' ? 3 : user?.subscriptionTier === 'basic' ? 2 : 1}
        placeholder="Search by title, author, or both..."
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
            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {getStepTitle(currentStep)}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Step {currentStep} of {totalSteps}
              </Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressStep,
                  {
                    backgroundColor:
                      index < currentStep
                        ? BookLoopColors.burntOrange
                        : colors.border,
                  },
                ]}
              />
            ))}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* STEP 1: Book Selection */}
          {currentStep === 1 && (
            <>
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
                {bookData.coverImage && (
                  <Image
                    source={{ uri: bookData.coverImage }}
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
                    onPress={() => {
                      setBookData(null);
                      setSelectedBook(null);
                      setManualTitle('');
                      setManualAuthor('');
                    }}
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
                  value={manualTitle}
                  onChangeText={setManualTitle}
                  placeholder="Book title"
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Author *
                </Text>
                <GlassInput
                  value={manualAuthor}
                  onChangeText={setManualAuthor}
                  placeholder="Author name"
                />
              </View>

              <GlassButton
                title="Use This Book"
                onPress={useManualEntry}
                variant="primary"
                size="md"
                disabled={!manualTitle.trim() || !manualAuthor.trim()}
                icon="checkmark-circle"
              />
            </GlassCard>
          )}
            </>
          )}

          {/* STEP 2: Listing Type & Condition */}
          {currentStep === 2 && (
            <>
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
            </>
          )}

          {/* STEP 3: Photos & Location */}
          {currentStep === 3 && (
            <>
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

          {/* Exchange Preferences (only show for exchange listings) */}
          {listingType === 'exchange' && (
            <GlassCard variant="lg" padding="lg">
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Books You Want in Exchange
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Select 1-3 books you'd like to receive (based on your subscription)
              </Text>

              {/* Selected Preferences */}
              {exchangePreferences.length > 0 && (
                <View style={{ marginBottom: Spacing.md }}>
                  {exchangePreferences.map((book) => (
                    <View
                      key={book.id}
                      style={[
                        styles.preferenceItem,
                        { borderColor: colors.border, backgroundColor: colors.surface },
                      ]}
                    >
                      {/* Priority Badge */}
                      <View style={styles.priorityBadge}>
                        <Text style={styles.priorityText}>{book.priority}</Text>
                      </View>

                      {/* Book Cover */}
                      {book.coverImage && (
                        <Image
                          source={{ uri: book.coverImage }}
                          style={styles.preferenceBookCover}
                        />
                      )}

                      {/* Book Info */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.preferenceBookTitle, { color: colors.text }]} numberOfLines={1}>
                          {book.title}
                        </Text>
                        <Text style={[styles.preferenceBookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                          {book.author}
                        </Text>
                      </View>

                      {/* Remove Button */}
                      <TouchableOpacity
                        onPress={() => {
                          const updated = exchangePreferences
                            .filter((b) => b.id !== book.id)
                            .map((b, idx) => ({ ...b, priority: idx + 1 }));
                          setExchangePreferences(updated);
                        }}
                        style={styles.removePreferenceButton}
                      >
                        <Ionicons name="close-circle" size={24} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Button */}
              <GlassButton
                title={exchangePreferences.length > 0 ? 'Add Another Book' : 'Add Books You Want'}
                onPress={() => setShowPreferenceSelector(true)}
                variant={exchangePreferences.length > 0 ? 'secondary' : 'primary'}
                size="md"
                icon="add-circle"
                disabled={exchangePreferences.length >= 3} // Max 3 for premium
              />

              {exchangePreferences.length === 0 && (
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Adding preferences helps others find your listing when they have books you want
                </Text>
              )}
            </GlassCard>
          )}

          {/* Location Info */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Location
            </Text>
            {location ? (
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={20} color={BookLoopColors.burntOrange} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locationText, { color: colors.text }]}>
                    {location.address}
                  </Text>
                  <Text style={[styles.locationSubtext, { color: colors.textSecondary }]}>
                    {location.city}, {location.region}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.locationInfo}>
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                  Getting your location...
                </Text>
              </View>
            )}
          </GlassCard>
            </>
          )}

          {/* STEP 4: Review & Publish */}
          {currentStep === 4 && (
            <>
          {/* Review Summary */}
          <GlassCard variant="lg" padding="lg">
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Review Your Listing
            </Text>

            {/* Book Summary */}
            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>
                Book
              </Text>
              <View style={styles.bookInfo}>
                {bookData?.coverImage && (
                  <Image
                    source={{ uri: bookData.coverImage }}
                    style={styles.reviewBookCover}
                  />
                )}
                <View style={styles.bookDetails}>
                  <Text style={[styles.bookTitle, { color: colors.text }]}>
                    {bookData?.title}
                  </Text>
                  <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>
                    by {bookData?.author}
                  </Text>
                </View>
              </View>
            </View>

            {/* Listing Details Summary */}
            <View style={styles.reviewSection}>
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>
                Listing Details
              </Text>
              <View style={styles.reviewDetails}>
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewDetailLabel, { color: colors.text }]}>Type:</Text>
                  <Text style={[styles.reviewDetailValue, { color: colors.text }]}>
                    {listingTypes.find(t => t.value === listingType)?.label}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewDetailLabel, { color: colors.text }]}>Condition:</Text>
                  <Text style={[styles.reviewDetailValue, { color: colors.text }]}>
                    {conditions.find(c => c.value === condition)?.label}
                  </Text>
                </View>
                {listingType === 'exchange' && exchangePreferences.length > 0 && (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewDetailLabel, { color: colors.text }]}>
                      Wants in exchange:
                    </Text>
                    <Text style={[styles.reviewDetailValue, { color: colors.text }]}>
                      {exchangePreferences.length} book(s)
                    </Text>
                  </View>
                )}
                {photos.length > 0 && (
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewDetailLabel, { color: colors.text }]}>Photos:</Text>
                    <Text style={[styles.reviewDetailValue, { color: colors.text }]}>
                      {photos.length} photo(s)
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Location Summary */}
            {location && (
              <View style={styles.reviewSection}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>
                  Location
                </Text>
                <Text style={[styles.reviewDetailValue, { color: colors.text }]}>
                  {location.city}, {location.region}
                </Text>
              </View>
            )}
          </GlassCard>

          {/* Publish Toggle */}
          <GlassCard variant="md" padding="md" style={styles.publishCard}>
            <TouchableOpacity
              onPress={() => setPublishImmediately(!publishImmediately)}
              style={styles.publishToggleContainer}
            >
              <View style={styles.publishToggleContent}>
                <Ionicons
                  name={publishImmediately ? 'globe-outline' : 'create-outline'}
                  size={24}
                  color={publishImmediately ? BookLoopColors.teal : BookLoopColors.warmGray}
                />
                <View style={styles.publishToggleText}>
                  <Text style={[styles.publishToggleTitle, { color: colors.text }]}>
                    {publishImmediately ? 'Publish Immediately' : 'Save as Draft'}
                  </Text>
                  <Text style={[styles.publishToggleSubtitle, { color: colors.textSecondary }]}>
                    {publishImmediately
                      ? 'Listing will be visible to all users'
                      : 'You can publish it later'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  {
                    backgroundColor: publishImmediately
                      ? BookLoopColors.teal
                      : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      transform: [{ translateX: publishImmediately ? 22 : 2 }],
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </GlassCard>

          {/* Create Button */}
          <GlassButton
            title={publishImmediately ? "Publish Listing" : "Save as Draft"}
            onPress={handleCreateListing}
            variant="primary"
            size="lg"
            loading={isSubmitting}
            disabled={isSubmitting || !bookData}
            icon={publishImmediately ? "globe" : "save"}
            style={styles.createButton}
          />
            </>
          )}

          {/* Navigation Controls */}
          <View style={styles.navigationControls}>
            {currentStep > 1 && (
              <GlassButton
                title="Back"
                onPress={handlePreviousStep}
                variant="secondary"
                size="md"
                icon="arrow-back"
                style={styles.navButton}
              />
            )}
            {currentStep < totalSteps && (
              <GlassButton
                title="Next"
                onPress={handleNextStep}
                variant="primary"
                size="md"
                icon="arrow-forward"
                style={styles.navButton}
              />
            )}
          </View>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
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
  publishCard: {
    marginBottom: Spacing.md,
  },
  publishToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  publishToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  publishToggleText: {
    flex: 1,
    gap: 2,
  },
  publishToggleTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  publishToggleSubtitle: {
    fontSize: Typography.fontSize.xs,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  createButton: {
    marginBottom: Spacing['2xl'],
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  priorityBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BookLoopColors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  preferenceBookCover: {
    width: 40,
    height: 60,
    borderRadius: 6,
    marginRight: Spacing.md,
  },
  preferenceBookTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  preferenceBookAuthor: {
    fontSize: Typography.fontSize.xs,
  },
  removePreferenceButton: {
    padding: Spacing.xs,
  },
  helperText: {
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  locationSubtext: {
    fontSize: Typography.fontSize.sm,
    marginTop: 2,
  },
  reviewSection: {
    marginBottom: Spacing.lg,
  },
  reviewLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewBookCover: {
    width: 60,
    height: 90,
    borderRadius: 8,
  },
  reviewDetails: {
    gap: Spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewDetailLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  reviewDetailValue: {
    fontSize: Typography.fontSize.sm,
  },
  navigationControls: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  navButton: {
    flex: 1,
  },
});
