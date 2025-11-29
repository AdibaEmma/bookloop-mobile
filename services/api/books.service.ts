/**
 * Books Service
 *
 * Handles books API calls.
 *
 * Features:
 * - Search books in database
 * - Search books by ISBN (Google Books)
 * - Get book details
 * - Create custom books
 * - Update book information
 */

import apiClient from './client';
import { AxiosResponse } from 'axios';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  coverImage?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
  createdAt: string;
  updatedAt: string;
}

interface SearchBookDto {
  query?: string;
  author?: string;
  isbn?: string;
  categories?: string[];
  limit?: number;
  offset?: number;
}

interface CreateBookDto {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  coverImage?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
}

interface CreateBookFromISBNDto {
  isbn: string;
}

/**
 * Google Books search result
 * Represents a book from the Google Books API search
 */
interface GoogleBookResult {
  googleBooksId: string;
  title: string;
  author: string;
  coverImage?: string;
  isbn?: string;
  publisher?: string;
  publishedYear?: number;
  description?: string;
}

interface CreateBookFromGoogleDto {
  googleBooksId: string;
  title?: string;
  author?: string;
}

interface UpdateBookDto {
  title?: string;
  author?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  coverImage?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Books Service
 */
export const booksService = {
  /**
   * Search books in database
   */
  async searchBooks(params: SearchBookDto): Promise<PaginatedResponse<Book>> {
    const response: AxiosResponse<PaginatedResponse<Book>> = await apiClient.get('/books/search', {
      params,
    });
    return response.data;
  },

  /**
   * Search book by ISBN (creates book from Google Books if not exists)
   */
  async searchByISBN(isbn: string): Promise<Book | null> {
    try {
      // First, try to search in local database
      const searchResponse = await apiClient.get('/books', {
        params: { query: isbn, limit: 1 },
      });

      if (searchResponse.data.books && searchResponse.data.books.length > 0) {
        return searchResponse.data.books[0];
      }

      // If not found locally, create from ISBN (fetches from Google Books)
      const response: AxiosResponse<Book> = await apiClient.post('/books/isbn', { isbn });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get book by ID
   */
  async getBookById(id: string): Promise<Book> {
    const response: AxiosResponse<Book> = await apiClient.get(`/books/${id}`);
    return response.data;
  },

  /**
   * Create custom book
   */
  async createBook(data: CreateBookDto): Promise<Book> {
    const response: AxiosResponse<Book> = await apiClient.post('/books', data);
    return response.data;
  },

  /**
   * Create book from ISBN (fetches metadata from Google Books)
   */
  async createBookFromISBN(data: CreateBookFromISBNDto): Promise<Book> {
    const response: AxiosResponse<Book> = await apiClient.post('/books/from-isbn', data);
    return response.data;
  },

  /**
   * Update book information
   */
  async updateBook(id: string, data: UpdateBookDto): Promise<Book> {
    const response: AxiosResponse<Book> = await apiClient.patch(`/books/${id}`, data);
    return response.data;
  },

  /**
   * Delete book
   */
  async deleteBook(id: string): Promise<void> {
    await apiClient.delete(`/books/${id}`);
  },

  /**
   * Get popular books (most listed)
   */
  async getPopularBooks(limit: number = 10): Promise<Book[]> {
    const response: AxiosResponse<Book[]> = await apiClient.get('/books/popular', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get book categories
   */
  async getCategories(): Promise<string[]> {
    const response: AxiosResponse<string[]> = await apiClient.get('/books/categories');
    return response.data;
  },

  /**
   * Get user's books (from their listings)
   */
  async getMyBooks(): Promise<Book[]> {
    const response: AxiosResponse<Book[]> = await apiClient.get('/books/my-books');
    return response.data;
  },

  /**
   * Search Google Books API directly
   *
   * Returns books from Google Books that can be added to the catalog.
   * Use this for discovering books not yet in the local database.
   *
   * @param query - Search query (title, author, or both)
   * @param maxResults - Maximum number of results (default: 10)
   * @returns Array of Google Books results
   */
  async searchGoogleBooks(query: string, maxResults: number = 10): Promise<GoogleBookResult[]> {
    const response = await apiClient.get('/books/external/google', {
      params: { query, maxResults },
    });

    // Transform response to match GoogleBookResult interface
    return response.data.map((item: any) => ({
      googleBooksId: item.provider_id,
      title: item.title,
      author: item.author,
      coverImage: item.cover_image,
      isbn: item.isbn,
      publisher: item.publisher,
      publishedYear: item.publication_year,
      description: item.description,
    }));
  },

  /**
   * Create book from Google Books ID
   *
   * Creates a book in the local database using Google Books metadata.
   * Returns the existing book if already cached.
   *
   * @param googleBooksId - Google Books volume ID
   * @param fallback - Fallback title/author if API lookup fails
   * @returns Created or existing book
   */
  async createFromGoogleBooks(
    googleBooksId: string,
    fallback?: { title: string; author: string },
  ): Promise<Book> {
    const response: AxiosResponse<Book> = await apiClient.post('/books/from-google', {
      googleBooksId,
      title: fallback?.title,
      author: fallback?.author,
    });
    return response.data;
  },
};

export type {
  Book,
  SearchBookDto,
  CreateBookDto,
  CreateBookFromISBNDto,
  CreateBookFromGoogleDto,
  GoogleBookResult,
  UpdateBookDto,
  PaginatedResponse,
};
