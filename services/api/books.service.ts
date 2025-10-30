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
  coverImageUrl?: string;
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
  coverImageUrl?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
}

interface CreateBookFromISBNDto {
  isbn: string;
}

interface UpdateBookDto {
  title?: string;
  author?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  coverImageUrl?: string;
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
   * Search book by ISBN from Google Books
   */
  async searchByISBN(isbn: string): Promise<Book> {
    const response: AxiosResponse<Book> = await apiClient.get(`/books/isbn/${isbn}`);
    return response.data;
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
};

export type {
  Book,
  SearchBookDto,
  CreateBookDto,
  CreateBookFromISBNDto,
  UpdateBookDto,
  PaginatedResponse,
};
