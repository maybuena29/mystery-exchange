import type {
  BudgetSettings,
  CreateGroupPayload,
  EventCategory,
  GroupSettings,
  ParticipantPreferences,
  WishlistCategory,
  WishlistItem,
} from '../../../src/types/exchange';
import { generateUrlSafeId } from './crypto';

const VALID_EVENT_CATEGORIES: ReadonlySet<EventCategory> = new Set([
  'Christmas',
  'Birthday',
  'Office Exchange',
  'Family Exchange',
  'Friends Exchange',
  'Custom',
]);

const VALID_WISHLIST_CATEGORIES: ReadonlySet<WishlistCategory> = new Set([
  'Gadgets',
  'Fashion',
  'Books',
  'Beauty',
  'Food',
  'Home',
  'Hobbies',
  'Experiences',
  'Other',
]);

const VALID_CURRENCIES = new Set(['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD']);

export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export function validateSafeHttpUrl(rawUrl: unknown): { valid: boolean; value?: string; error?: string } {
  if (rawUrl === undefined || rawUrl === null || rawUrl === '') {
    return { valid: true, value: undefined };
  }
  if (typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL must be a string.' };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: true, value: undefined };
  }
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL is too long (max 2048 characters).' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only http:// and https:// URLs are allowed.' };
    }
    return { valid: true, value: parsed.toString() };
  } catch {
    return { valid: false, error: 'Please enter a valid URL starting with https:// or http://.' };
  }
}

export function validateBudget(raw: unknown): { valid: boolean; budget?: BudgetSettings; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: true, budget: { currency: 'PHP' } };
  }
  const input = raw as Record<string, unknown>;
  const rawCurrency = typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : 'PHP';
  const currency = VALID_CURRENCIES.has(rawCurrency) ? rawCurrency : 'PHP';

  const parseAmount = (v: unknown): number | undefined => {
    if (v === undefined || v === null || v === '') return undefined;
    const num = Number(v);
    if (!Number.isFinite(num) || num < 0 || num > 10_000_000) return NaN;
    return Math.round(num * 100) / 100;
  };

  const amount = parseAmount(input.amount);
  const min = parseAmount(input.min);
  const max = parseAmount(input.max);

  if (Number.isNaN(amount) || Number.isNaN(min) || Number.isNaN(max)) {
    return { valid: false, error: 'Budget amounts must be valid non-negative numbers.' };
  }
  if (min !== undefined && max !== undefined && min > max) {
    return { valid: false, error: 'Minimum budget cannot exceed maximum budget.' };
  }

  return { valid: true, budget: { amount, min, max, currency } };
}

export function validateGroupSettings(raw: unknown): { valid: boolean; settings?: GroupSettings; error?: string } {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const maxParticipantsRaw = input.maxParticipants !== undefined ? Number(input.maxParticipants) : 50;
  const maxWishlistRaw = input.maxWishlistItems !== undefined ? Number(input.maxWishlistItems) : 20;

  if (!Number.isInteger(maxParticipantsRaw) || maxParticipantsRaw < 3 || maxParticipantsRaw > 50) {
    return { valid: false, error: 'Participant limit must be an integer between 3 and 50.' };
  }
  if (!Number.isInteger(maxWishlistRaw) || maxWishlistRaw < 1 || maxWishlistRaw > 20) {
    return { valid: false, error: 'Maximum wishlist items must be between 1 and 20.' };
  }

  return {
    valid: true,
    settings: {
      maxParticipants: maxParticipantsRaw,
      maxWishlistItems: maxWishlistRaw,
      allowEditBeforeDraw: input.allowEditBeforeDraw !== undefined ? Boolean(input.allowEditBeforeDraw) : true,
      allowEditAfterDraw: input.allowEditAfterDraw !== undefined ? Boolean(input.allowEditAfterDraw) : false,
      requireCompletedWishlist:
        input.requireCompletedWishlist !== undefined ? Boolean(input.requireCompletedWishlist) : false,
    },
  };
}

export function validateCreateGroupPayload(raw: unknown): {
  valid: boolean;
  data?: CreateGroupPayload & { category: EventCategory; settings: GroupSettings; budget: BudgetSettings };
  error?: string;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Invalid request body.' };
  }
  const input = raw as Record<string, unknown>;
  const groupName = cleanText(input.groupName, 100);
  if (groupName.length < 2) {
    return { valid: false, error: 'Group name must be at least 2 characters.' };
  }

  const categoryRaw = typeof input.category === 'string' ? (input.category as EventCategory) : 'Christmas';
  const category: EventCategory = VALID_EVENT_CATEGORIES.has(categoryRaw) ? categoryRaw : 'Custom';

  const budgetRes = validateBudget(input.budget);
  if (!budgetRes.valid || !budgetRes.budget) {
    return { valid: false, error: budgetRes.error };
  }

  const settingsRes = validateGroupSettings(input.settings);
  if (!settingsRes.valid || !settingsRes.settings) {
    return { valid: false, error: settingsRes.error };
  }

  return {
    valid: true,
    data: {
      groupName,
      description: cleanText(input.description, 500) || undefined,
      category,
      eventDate: cleanText(input.eventDate, 32) || undefined,
      registrationDeadline: cleanText(input.registrationDeadline, 32) || undefined,
      instructions: cleanText(input.instructions, 1000) || undefined,
      budget: budgetRes.budget,
      settings: settingsRes.settings,
    },
  };
}

export function validateWishlistItems(
  rawItems: unknown,
  maxItems: number
): { valid: boolean; items?: WishlistItem[]; error?: string } {
  if (rawItems === undefined || rawItems === null) {
    return { valid: true, items: [] };
  }
  if (!Array.isArray(rawItems)) {
    return { valid: false, error: 'Wishlist must be an array of items.' };
  }
  if (rawItems.length > maxItems) {
    return { valid: false, error: `Wishlist cannot exceed ${maxItems} items.` };
  }

  const normalized: WishlistItem[] = [];
  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i];
    if (!raw || typeof raw !== 'object') {
      return { valid: false, error: `Wishlist item #${i + 1} is invalid.` };
    }
    const item = raw as Record<string, unknown>;
    const name = cleanText(item.name, 120);
    if (!name) {
      return { valid: false, error: `Wishlist item #${i + 1} requires an item name.` };
    }

    const description = cleanText(item.description, 400);
    const catRaw = typeof item.category === 'string' ? (item.category as WishlistCategory) : 'Other';
    const category: WishlistCategory = VALID_WISHLIST_CATEGORIES.has(catRaw) ? catRaw : 'Other';

    let estimatedPrice: number | undefined;
    if (item.estimatedPrice !== undefined && item.estimatedPrice !== null && item.estimatedPrice !== '') {
      const price = Number(item.estimatedPrice);
      if (!Number.isFinite(price) || price < 0 || price > 10_000_000) {
        return { valid: false, error: `Wishlist item "${name}" has an invalid estimated price.` };
      }
      estimatedPrice = Math.round(price * 100) / 100;
    }

    const productUrlRes = validateSafeHttpUrl(item.productUrl);
    if (!productUrlRes.valid) {
      return { valid: false, error: `Wishlist item "${name}" product URL: ${productUrlRes.error}` };
    }

    const imageUrlRes = validateSafeHttpUrl(item.imageUrl);
    if (!imageUrlRes.valid) {
      return { valid: false, error: `Wishlist item "${name}" image URL: ${imageUrlRes.error}` };
    }

    const priority = item.priority === 'must_have' ? 'must_have' : 'nice_to_have';
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 32) : generateUrlSafeId(6);

    normalized.push({
      id,
      name,
      description,
      category,
      estimatedPrice,
      productUrl: productUrlRes.value,
      imageUrl: imageUrlRes.value,
      priority,
      order: i,
    });
  }

  return { valid: true, items: normalized };
}

export function validatePreferences(raw: unknown): ParticipantPreferences {
  if (!raw || typeof raw !== 'object') return {};
  const input = raw as Record<string, unknown>;
  return {
    hobbies: cleanText(input.hobbies, 300) || undefined,
    favorites: cleanText(input.favorites, 300) || undefined,
    preferredColors: cleanText(input.preferredColors, 150) || undefined,
    avoidItems: cleanText(input.avoidItems, 300) || undefined,
  };
}
