import { describe, expect, it } from 'vitest';

import {
  getFoodImageCacheExpiration,
  isFreshFoodImageCacheRecord,
  mapFoodImageCacheRecord,
  normalizeImageQuery,
} from './cache';

describe('normalizeImageQuery', () => {
  it('normalizes whitespace and casing for cache keys', () => {
    expect(normalizeImageQuery('  Baby   Spinach Produce Food Ingredient  ')).toBe(
      'baby spinach produce food ingredient',
    );
  });
});

describe('food image cache helpers', () => {
  it('sets cache expiration 30 days ahead', () => {
    expect(getFoodImageCacheExpiration(new Date('2026-06-01T12:00:00.000Z'))).toBe(
      '2026-07-01T12:00:00.000Z',
    );
  });

  it('treats future records as fresh', () => {
    expect(
      isFreshFoodImageCacheRecord(
        {
          expires_at: '2026-06-02T12:00:00.000Z',
          image_url: 'https://example.com/spinach.jpg',
          provider: 'pexels',
        },
        new Date('2026-06-01T12:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('maps database rows to API image payloads', () => {
    expect(
      mapFoodImageCacheRecord({
        alt: 'Fresh spinach',
        expires_at: '2026-06-02T12:00:00.000Z',
        image_url: 'https://example.com/spinach.jpg',
        photographer: 'Photographer',
        photographer_url: 'https://example.com/photographer',
        provider: 'pexels',
      }),
    ).toEqual({
      alt: 'Fresh spinach',
      imageUrl: 'https://example.com/spinach.jpg',
      photographer: 'Photographer',
      photographerUrl: 'https://example.com/photographer',
      provider: 'pexels',
    });
  });

  it('maps future generated-image provider rows', () => {
    expect(
      mapFoodImageCacheRecord({
        alt: 'Generated spinach dish',
        expires_at: '2026-06-02T12:00:00.000Z',
        image_url: 'https://example.com/generated.webp',
        provider: 'openai',
      }),
    ).toEqual({
      alt: 'Generated spinach dish',
      imageUrl: 'https://example.com/generated.webp',
      photographer: undefined,
      photographerUrl: undefined,
      provider: 'openai',
    });
  });
});
