import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { booksService, Book, CreateBookDto } from '@/services/api/books.service';

interface BookSearchCreateProps {
  onSelectBook: (book: Book) => void;
  onCancel?: () => void;
  placeholder?: string;
}

/**
 * BookSearchCreate Component
 *
 * Allows users to search for existing books or create new ones.
 *
 * Features:
 * - Search existing books in database
 * - Display search results with book covers
 * - Create new book manually
 * - Scan ISBN to auto-populate (future)
 */
export function BookSearchCreate({
  onSelectBook,
  onCancel,
  placeholder = 'Search for a book...',
}: BookSearchCreateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const glassStyle = GlassEffect[colorScheme];

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create form state
  const [newBook, setNewBook] = useState<CreateBookDto>({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    description: '',
  });

  // Search books with debounce
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const response = await booksService.searchBooks({
            query: searchQuery,
            limit: 10,
          });
          setSearchResults(response.data);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  const handleCreateBook = async () => {
    if (!newBook.title || !newBook.author) {
      return;
    }

    setIsCreating(true);
    try {
      const createdBook = await booksService.createBook(newBook);
      onSelectBook(createdBook);
      setShowCreateForm(false);
      setNewBook({ title: '', author: '', isbn: '', publisher: '', description: '' });
    } catch (error) {
      console.error('Create book error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const useBlur = Platform.OS === 'ios' || Platform.OS === 'android';
  const Container = useBlur ? BlurView : View;
  const containerProps = useBlur
    ? { intensity: 20, tint: colorScheme }
    : { style: { backgroundColor: glassStyle.backgroundColor } };

  if (showCreateForm) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setShowCreateForm(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Create New Book
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.formField}>
              <Text style={[styles.label, { color: colors.text }]}>
                Title <Text style={{ color: BookLoopColors.burntOrange }}>*</Text>
              </Text>
              <Container
                {...containerProps}
                style={[
                  styles.input,
                  { borderColor: glassStyle.borderColor, borderWidth: glassStyle.borderWidth },
                ]}
              >
                <TextInput
                  value={newBook.title}
                  onChangeText={(text) => setNewBook({ ...newBook, title: text })}
                  placeholder="Enter book title"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.inputText, { color: colors.text }]}
                />
              </Container>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.label, { color: colors.text }]}>
                Author <Text style={{ color: BookLoopColors.burntOrange }}>*</Text>
              </Text>
              <Container
                {...containerProps}
                style={[
                  styles.input,
                  { borderColor: glassStyle.borderColor, borderWidth: glassStyle.borderWidth },
                ]}
              >
                <TextInput
                  value={newBook.author}
                  onChangeText={(text) => setNewBook({ ...newBook, author: text })}
                  placeholder="Enter author name"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.inputText, { color: colors.text }]}
                />
              </Container>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.label, { color: colors.text }]}>ISBN (Optional)</Text>
              <Container
                {...containerProps}
                style={[
                  styles.input,
                  { borderColor: glassStyle.borderColor, borderWidth: glassStyle.borderWidth },
                ]}
              >
                <TextInput
                  value={newBook.isbn}
                  onChangeText={(text) => setNewBook({ ...newBook, isbn: text })}
                  placeholder="Enter ISBN"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.inputText, { color: colors.text }]}
                  keyboardType="numeric"
                />
              </Container>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.label, { color: colors.text }]}>Publisher (Optional)</Text>
              <Container
                {...containerProps}
                style={[
                  styles.input,
                  { borderColor: glassStyle.borderColor, borderWidth: glassStyle.borderWidth },
                ]}
              >
                <TextInput
                  value={newBook.publisher}
                  onChangeText={(text) => setNewBook({ ...newBook, publisher: text })}
                  placeholder="Enter publisher"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.inputText, { color: colors.text }]}
                />
              </Container>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.label, { color: colors.text }]}>Description (Optional)</Text>
              <Container
                {...containerProps}
                style={[
                  styles.input,
                  styles.textArea,
                  { borderColor: glassStyle.borderColor, borderWidth: glassStyle.borderWidth },
                ]}
              >
                <TextInput
                  value={newBook.description}
                  onChangeText={(text) => setNewBook({ ...newBook, description: text })}
                  placeholder="Enter description"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.inputText, { color: colors.text }]}
                  multiline
                  numberOfLines={4}
                />
              </Container>
            </View>

            {/* Create Button */}
            <TouchableOpacity
              onPress={handleCreateBook}
              disabled={!newBook.title || !newBook.author || isCreating}
              style={[
                styles.createButton,
                (!newBook.title || !newBook.author || isCreating) && styles.createButtonDisabled,
              ]}
            >
              {isCreating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Create Book</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <GlassSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={placeholder}
        />
      </View>

      {/* Results or Empty State */}
      <ScrollView
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
      >
        {isSearching ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={BookLoopColors.burntOrange} />
          </View>
        ) : searchQuery.trim().length >= 2 ? (
          searchResults.length > 0 ? (
            <>
              {searchResults.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  onPress={() => onSelectBook(book)}
                  style={[
                    styles.bookItem,
                    { borderColor: glassStyle.borderColor },
                  ]}
                >
                  {book.coverImage ? (
                    <Image
                      source={{ uri: book.coverImage }}
                      style={styles.bookCover}
                    />
                  ) : (
                    <View style={[styles.bookCover, styles.bookCoverPlaceholder, { backgroundColor: colors.surface }]}>
                      <Ionicons name="book" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.bookInfo}>
                    <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={[styles.bookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                      {book.author}
                    </Text>
                    {book.publishedDate && (
                      <Text style={[styles.bookYear, { color: colors.textSecondary }]}>
                        {new Date(book.publishedDate).getFullYear()}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <View style={styles.centerContent}>
              <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No books found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Try a different search or create a new book
              </Text>
            </View>
          )
        ) : (
          <View style={styles.centerContent}>
            <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Search for a book
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Or create a new one below
            </Text>
          </View>
        )}

        {/* Create New Book Button */}
        <TouchableOpacity
          onPress={() => setShowCreateForm(true)}
          style={styles.createNewButton}
        >
          <Ionicons name="add-circle" size={24} color={BookLoopColors.burntOrange} />
          <Text style={[styles.createNewText, { color: BookLoopColors.burntOrange }]}>
            Create New Book
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Cancel Button */}
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  centerContent: {
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
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  bookCover: {
    width: 50,
    height: 75,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  bookCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  bookAuthor: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs / 2,
  },
  bookYear: {
    fontSize: Typography.fontSize.xs,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: BookLoopColors.burntOrange,
    borderStyle: 'dashed',
  },
  createNewText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  cancelButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '500',
  },

  // Form styles
  formContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  backButton: {
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
  },
  form: {
    marginTop: Spacing.md,
  },
  formField: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  textArea: {
    minHeight: 100,
    paddingVertical: Spacing.md,
  },
  inputText: {
    fontSize: Typography.fontSize.base,
  },
  createButton: {
    backgroundColor: BookLoopColors.burntOrange,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
  },
});
