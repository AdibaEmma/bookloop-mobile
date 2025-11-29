import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  BorderRadius,
  Spacing,
  GlassEffect,
  BookLoopColors,
} from '@/constants/theme';
import { GlassSearchBar } from './ui/GlassSearchBar';
import { GoogleBookSuggestionItem } from './GoogleBookSuggestionItem';
import {
  booksService,
  Book,
  GoogleBookResult,
} from '@/services/api/books.service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

interface SelectedBook extends Book {
  priority: number;
}

interface QuickBookSearchProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (books: SelectedBook[]) => void;
  existingBookIds?: string[];
  maxBooks: number;
  placeholder?: string;
}

/**
 * QuickBookSearch Component
 *
 * Bottom sheet for quickly searching and selecting books from Google Books.
 *
 * Features:
 * - Multi-select mode (up to maxBooks)
 * - Real-time Google Books search with debounce
 * - Selected books preview at top
 * - "Create manually" fallback
 * - Done button to confirm selection
 */
export function QuickBookSearch({
  visible,
  onClose,
  onConfirm,
  existingBookIds = [],
  maxBooks,
  placeholder = 'Search by title, author, or both...',
}: QuickBookSearchProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const glassStyle = GlassEffect[colorScheme];

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [googleResults, setGoogleResults] = useState<GoogleBookResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<SelectedBook[]>([]);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [showManualCreate, setShowManualCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual entry state
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  // Animation for slide up
  const slideAnim = useState(new Animated.Value(BOTTOM_SHEET_HEIGHT))[0];

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: BOTTOM_SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setGoogleResults([]);
      setSelectedBooks([]);
      setError(null);
      setShowManualCreate(false);
      setManualTitle('');
      setManualAuthor('');
    }
  }, [visible]);

  // Debounced Google Books search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 3) {
        setIsSearching(true);
        setError(null);
        try {
          const results = await booksService.searchGoogleBooks(searchQuery, 10);
          // Filter out already-added books from existing preferences
          const selectedGoogleIds = selectedBooks
            .filter((b) => (b as any).googleBooksId)
            .map((b) => (b as any).googleBooksId);

          const filtered = results.filter(
            (r) =>
              !existingBookIds.includes(r.googleBooksId) &&
              !selectedGoogleIds.includes(r.googleBooksId)
          );
          setGoogleResults(filtered);
        } catch (err) {
          console.error('Google Books search failed:', err);
          setError('Search failed. Please try again.');
          setGoogleResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setGoogleResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, existingBookIds, selectedBooks]);

  // Check if at limit
  const isAtLimit = selectedBooks.length >= maxBooks;

  // Handle selecting a book from Google results
  const handleSelectBook = useCallback(
    async (googleBook: GoogleBookResult) => {
      if (isAtLimit) return;

      setCreatingId(googleBook.googleBooksId);
      try {
        const book = await booksService.createFromGoogleBooks(
          googleBook.googleBooksId,
          { title: googleBook.title, author: googleBook.author }
        );

        const newBook: SelectedBook = {
          ...book,
          priority: selectedBooks.length + 1,
        };

        setSelectedBooks((prev) => [...prev, newBook]);

        // Remove from search results
        setGoogleResults((prev) =>
          prev.filter((r) => r.googleBooksId !== googleBook.googleBooksId)
        );
      } catch (err) {
        console.error('Failed to add book:', err);
        setError('Failed to add book. Please try again.');
      } finally {
        setCreatingId(null);
      }
    },
    [isAtLimit, selectedBooks.length]
  );

  // Handle removing a selected book
  const handleRemoveBook = useCallback((bookId: string) => {
    setSelectedBooks((prev) => {
      const updated = prev
        .filter((b) => b.id !== bookId)
        .map((b, index) => ({ ...b, priority: index + 1 }));
      return updated;
    });
  }, []);

  // Handle manual book creation with just title + author
  const handleManualCreate = useCallback(async () => {
    if (isAtLimit) return;
    if (!manualTitle.trim() || !manualAuthor.trim()) {
      setError('Please enter both title and author');
      return;
    }

    setIsCreatingManual(true);
    setError(null);

    try {
      // Create book with just title and author
      const book = await booksService.createBook({
        title: manualTitle.trim(),
        author: manualAuthor.trim(),
      });

      const newBook: SelectedBook = {
        ...book,
        priority: selectedBooks.length + 1,
      };

      setSelectedBooks((prev) => [...prev, newBook]);
      setShowManualCreate(false);
      setManualTitle('');
      setManualAuthor('');
    } catch (err) {
      console.error('Failed to create book:', err);
      setError('Failed to create book. Please try again.');
    } finally {
      setIsCreatingManual(false);
    }
  }, [isAtLimit, manualTitle, manualAuthor, selectedBooks.length]);

  // Handle done
  const handleDone = useCallback(() => {
    onConfirm(selectedBooks);
    onClose();
  }, [selectedBooks, onConfirm, onClose]);

  // Get blur container
  const useBlur = Platform.OS === 'ios' || Platform.OS === 'android';
  const InputContainer = useBlur ? BlurView : View;
  const inputContainerProps = useBlur
    ? { intensity: 20, tint: colorScheme }
    : { style: { backgroundColor: glassStyle.backgroundColor } };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalContainer}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: colors.background,
              height: BOTTOM_SHEET_HEIGHT,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={showManualCreate ? () => setShowManualCreate(false) : onClose}
              style={styles.closeButton}
            >
              <Ionicons
                name={showManualCreate ? 'arrow-back' : 'close'}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {showManualCreate ? 'Add by Title & Author' : 'Add Books You Want'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* MANUAL ENTRY MODE */}
          {showManualCreate ? (
            <View style={styles.manualFormContainer}>
              <Text style={[styles.manualFormHint, { color: colors.textSecondary }]}>
                Just enter the title and author - we'll handle the rest!
              </Text>

              {/* Title Input */}
              <View style={styles.manualFormField}>
                <Text style={[styles.manualFormLabel, { color: colors.text }]}>
                  Title <Text style={{ color: BookLoopColors.burntOrange }}>*</Text>
                </Text>
                <InputContainer
                  {...inputContainerProps}
                  style={[
                    styles.manualInput,
                    { borderColor: glassStyle.borderColor, borderWidth: glassStyle.borderWidth },
                  ]}
                >
                  <TextInput
                    value={manualTitle}
                    onChangeText={setManualTitle}
                    placeholder="Enter book title"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.manualInputText, { color: colors.text }]}
                    autoFocus
                  />
                </InputContainer>
              </View>

              {/* Author Input */}
              <View style={styles.manualFormField}>
                <Text style={[styles.manualFormLabel, { color: colors.text }]}>
                  Author <Text style={{ color: BookLoopColors.burntOrange }}>*</Text>
                </Text>
                <InputContainer
                  {...inputContainerProps}
                  style={[
                    styles.manualInput,
                    { borderColor: glassStyle.borderColor, borderWidth: glassStyle.borderWidth },
                  ]}
                >
                  <TextInput
                    value={manualAuthor}
                    onChangeText={setManualAuthor}
                    placeholder="Enter author name"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.manualInputText, { color: colors.text }]}
                  />
                </InputContainer>
              </View>

              {/* Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#E74C3C" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Add Button */}
              <TouchableOpacity
                onPress={handleManualCreate}
                disabled={!manualTitle.trim() || !manualAuthor.trim() || isCreatingManual}
                style={[
                  styles.manualAddButton,
                  (!manualTitle.trim() || !manualAuthor.trim() || isCreatingManual) &&
                    styles.manualAddButtonDisabled,
                ]}
              >
                {isCreatingManual ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.manualAddButtonText}>Add Book</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <>
          {/* Selected Books Section */}
          {selectedBooks.length > 0 && (
            <View style={styles.selectedSection}>
              <View style={styles.selectedHeader}>
                <Text style={[styles.selectedTitle, { color: colors.text }]}>
                  Selected ({selectedBooks.length}/{maxBooks})
                </Text>
              </View>
              <FlatList
                data={selectedBooks}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.selectedList}
                renderItem={({ item }) => (
                  <View style={[styles.selectedItem, { backgroundColor: glassStyle.backgroundColor }]}>
                    {item.coverImage ? (
                      <Image source={{ uri: item.coverImage }} style={styles.selectedCover} />
                    ) : (
                      <View style={[styles.selectedCover, styles.selectedCoverPlaceholder, { backgroundColor: colors.surface }]}>
                        <Ionicons name="book" size={16} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={[styles.selectedBookTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveBook(item.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <GlassSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={placeholder}
            />
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#E74C3C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Results */}
          <FlatList
            data={googleResults}
            keyExtractor={(item) => item.googleBooksId}
            style={styles.resultsList}
            contentContainerStyle={styles.resultsContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyState}>
                {isSearching ? (
                  <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
                ) : searchQuery.trim().length >= 3 ? (
                  <>
                    <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No books found
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                      Try different keywords or create manually
                    </Text>
                  </>
                ) : searchQuery.trim().length > 0 ? (
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    Keep typing to search...
                  </Text>
                ) : (
                  <>
                    <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Search for books
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                      Type title, author, or both
                    </Text>
                  </>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <GoogleBookSuggestionItem
                book={item}
                onPress={() => handleSelectBook(item)}
                isLoading={creatingId === item.googleBooksId}
                isSelected={false}
                disabled={isAtLimit}
              />
            )}
          />

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: glassStyle.borderColor }]}>
            {/* Add by Title/Author Link */}
            <TouchableOpacity
              onPress={() => setShowManualCreate(true)}
              style={styles.manualCreateButton}
              disabled={isAtLimit}
            >
              <Ionicons
                name="add-outline"
                size={18}
                color={isAtLimit ? colors.textSecondary : BookLoopColors.burntOrange}
              />
              <Text
                style={[
                  styles.manualCreateText,
                  { color: isAtLimit ? colors.textSecondary : BookLoopColors.burntOrange },
                ]}
              >
                Can't find it? Add by title
              </Text>
            </TouchableOpacity>

            {/* Done Button */}
            <TouchableOpacity
              onPress={handleDone}
              style={[
                styles.doneButton,
                selectedBooks.length === 0 && styles.doneButtonDisabled,
              ]}
              disabled={selectedBooks.length === 0}
            >
              <Text style={styles.doneButtonText}>
                Done {selectedBooks.length > 0 ? `(${selectedBooks.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  selectedSection: {
    paddingBottom: Spacing.md,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  selectedTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },
  selectedList: {
    paddingHorizontal: Spacing.md,
  },
  selectedItem: {
    alignItems: 'center',
    marginRight: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    width: 80,
    position: 'relative',
  },
  selectedCover: {
    width: 50,
    height: 70,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  selectedCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBookTitle: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    width: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: Typography.fontSize.sm,
    marginLeft: Spacing.xs,
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  manualCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualCreateText: {
    fontSize: Typography.fontSize.sm,
    marginLeft: Spacing.xs,
  },
  doneButton: {
    backgroundColor: BookLoopColors.burntOrange,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  doneButtonDisabled: {
    opacity: 0.5,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
  // Manual form styles
  manualFormContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  manualFormHint: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  manualFormField: {
    marginBottom: Spacing.md,
  },
  manualFormLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  manualInput: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  manualInputText: {
    fontSize: Typography.fontSize.base,
    paddingVertical: Spacing.xs,
  },
  manualAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BookLoopColors.burntOrange,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  manualAddButtonDisabled: {
    opacity: 0.5,
  },
  manualAddButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
});
