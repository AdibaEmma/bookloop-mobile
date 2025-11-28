import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  Colors,
  Typography,
  BorderRadius,
  Spacing,
  GlassEffect,
  BookLoopColors,
} from '@/constants/theme';
import { Book } from '@/services/api/books.service';
import { BookSearchCreate } from './BookSearchCreate';
import { useAuth } from '@/contexts/auth-context';

interface SelectedBook extends Book {
  priority: number;
}

interface ExchangePreferenceSelectorProps {
  selectedBooks: SelectedBook[];
  onBooksChange: (books: SelectedBook[]) => void;
  onClose?: () => void;
}

/**
 * ExchangePreferenceSelector Component
 *
 * Allows users to select 1-3 books they want in exchange.
 * Number of selections depends on subscription tier:
 * - Free: 1 book
 * - Basic: 2 books
 * - Premium: 3 books
 *
 * Features:
 * - Add books via search/create
 * - Remove books
 * - Reorder priority (drag & drop or arrows)
 * - Subscription tier-based limits
 */
export function ExchangePreferenceSelector({
  selectedBooks,
  onBooksChange,
  onClose,
}: ExchangePreferenceSelectorProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const glassStyle = GlassEffect[colorScheme];
  const { user } = useAuth();

  const [showBookSearch, setShowBookSearch] = useState(false);

  // Get max books based on subscription tier
  const getMaxBooks = () => {
    switch (user?.subscriptionTier) {
      case 'basic':
        return 2;
      case 'premium':
        return 3;
      default:
        return 1;
    }
  };

  const maxBooks = getMaxBooks();
  const canAddMore = selectedBooks.length < maxBooks;

  const handleAddBook = (book: Book) => {
    if (!canAddMore) {
      Alert.alert(
        'Limit Reached',
        `Your ${user?.subscriptionTier || 'free'} plan allows up to ${maxBooks} book preference(s).`,
      );
      return;
    }

    // Check if book already selected
    if (selectedBooks.some((b) => b.id === book.id)) {
      Alert.alert('Already Added', 'This book is already in your preferences.');
      return;
    }

    // Add with next priority
    const newBook: SelectedBook = {
      ...book,
      priority: selectedBooks.length + 1,
    };

    onBooksChange([...selectedBooks, newBook]);
    setShowBookSearch(false);
  };

  const handleRemoveBook = (bookId: string) => {
    const updatedBooks = selectedBooks
      .filter((b) => b.id !== bookId)
      .map((b, index) => ({ ...b, priority: index + 1 })); // Reassign priorities

    onBooksChange(updatedBooks);
  };

  const handleMovePriority = (bookId: string, direction: 'up' | 'down') => {
    const currentIndex = selectedBooks.findIndex((b) => b.id === bookId);

    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === selectedBooks.length - 1)
    ) {
      return; // Can't move further
    }

    const updatedBooks = [...selectedBooks];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    // Swap
    [updatedBooks[currentIndex], updatedBooks[targetIndex]] = [
      updatedBooks[targetIndex],
      updatedBooks[currentIndex],
    ];

    // Reassign priorities
    const booksWithPriority = updatedBooks.map((b, index) => ({
      ...b,
      priority: index + 1,
    }));

    onBooksChange(booksWithPriority);
  };

  if (showBookSearch) {
    return (
      <BookSearchCreate
        onSelectBook={handleAddBook}
        onCancel={() => setShowBookSearch(false)}
        placeholder="Search for a book you want..."
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Books You Want
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Subscription Info */}
      <View style={[styles.infoCard, { backgroundColor: glassStyle.backgroundColor }]}>
        <Ionicons name="information-circle" size={20} color={BookLoopColors.burntOrange} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Your <Text style={{ fontWeight: '700', color: BookLoopColors.burntOrange }}>
            {user?.subscriptionTier || 'free'}
          </Text> plan allows up to{' '}
          <Text style={{ fontWeight: '700' }}>{maxBooks}</Text> book preference(s)
        </Text>
      </View>

      {/* Selected Books List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
      >
        {selectedBooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No preferences added yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Add books you'd like to receive in exchange
            </Text>
          </View>
        ) : (
          selectedBooks.map((book, index) => (
            <View
              key={book.id}
              style={[
                styles.bookItem,
                { borderColor: glassStyle.borderColor, backgroundColor: glassStyle.backgroundColor },
              ]}
            >
              {/* Priority Badge */}
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>{book.priority}</Text>
              </View>

              {/* Book Cover */}
              {book.coverImage ? (
                <Image
                  source={{ uri: book.coverImage }}
                  style={styles.bookCover}
                />
              ) : (
                <View style={[styles.bookCover, styles.bookCoverPlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="book" size={28} color={colors.textSecondary} />
                </View>
              )}

              {/* Book Info */}
              <View style={styles.bookInfo}>
                <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>
                  {book.title}
                </Text>
                <Text style={[styles.bookAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                  {book.author}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {/* Move Up */}
                <TouchableOpacity
                  onPress={() => handleMovePriority(book.id, 'up')}
                  disabled={index === 0}
                  style={[styles.actionButton, index === 0 && styles.actionButtonDisabled]}
                >
                  <Ionicons
                    name="chevron-up"
                    size={20}
                    color={index === 0 ? colors.textSecondary : BookLoopColors.burntOrange}
                  />
                </TouchableOpacity>

                {/* Move Down */}
                <TouchableOpacity
                  onPress={() => handleMovePriority(book.id, 'down')}
                  disabled={index === selectedBooks.length - 1}
                  style={[
                    styles.actionButton,
                    index === selectedBooks.length - 1 && styles.actionButtonDisabled,
                  ]}
                >
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={
                      index === selectedBooks.length - 1
                        ? colors.textSecondary
                        : BookLoopColors.burntOrange
                    }
                  />
                </TouchableOpacity>

                {/* Remove */}
                <TouchableOpacity
                  onPress={() => handleRemoveBook(book.id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Add Book Button */}
        {canAddMore && (
          <TouchableOpacity
            onPress={() => setShowBookSearch(true)}
            style={styles.addButton}
          >
            <Ionicons name="add-circle" size={24} color={BookLoopColors.burntOrange} />
            <Text style={[styles.addButtonText, { color: BookLoopColors.burntOrange }]}>
              Add Book Preference
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    marginLeft: Spacing.sm,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
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
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
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
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
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
  },
  actions: {
    flexDirection: 'column',
    gap: Spacing.xs / 2,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  actionButtonDisabled: {
    opacity: 0.3,
  },
  addButton: {
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
  addButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
});
