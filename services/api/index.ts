/**
 * API Services
 *
 * Centralized export for all API services.
 *
 * Usage:
 * ```tsx
 * import { authService, booksService, listingsService } from '@/services/api';
 *
 * const user = await authService.login({ phone, password });
 * const listings = await listingsService.searchListings({ query: 'React' });
 * ```
 */

// Export client and token manager
export { default as apiClient, TokenManager } from './client';

// Export services
export { authService } from './auth.service';
export { booksService } from './books.service';
export { listingsService } from './listings.service';
export { exchangesService } from './exchanges.service';
export { usersService } from './users.service';

// Export types
export type {
  RegisterDto,
  VerifyOtpDto,
  LoginDto,
  AuthResponse,
  User,
} from './auth.service';

export type {
  Book,
  SearchBookDto,
  CreateBookDto,
  CreateBookFromISBNDto,
  UpdateBookDto,
  PaginatedResponse,
} from './books.service';

export type {
  Listing,
  SearchListingDto,
  CreateListingDto,
  UpdateListingDto,
} from './listings.service';

export type {
  Exchange,
  Rating,
  CreateExchangeDto,
  RespondExchangeDto,
  SetMeetupDto,
  CreateRatingDto,
} from './exchanges.service';

export type {
  UpdateProfileDto,
  UpdateLocationDto,
  NearbyUser,
} from './users.service';
