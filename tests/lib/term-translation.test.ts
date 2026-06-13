import { beforeEach, describe, expect, it, vi } from 'vitest';

const asyncStorageMock = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));

const supabaseFunctionsMock = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: asyncStorageMock,
}));

vi.mock('@/lib/shared/supabase', () => ({
  supabase: {
    functions: supabaseFunctionsMock,
  },
}));

import { getLocalPantryTermTranslation, normalizePantryTerm } from '@/lib/i18n/pantry-term-dictionary';
import { clearTermTranslationClientCache, translateTerms } from '@/lib/i18n/term-translation';

describe('pantry term dictionary', () => {
  it('translates common pantry terms locally', () => {
    expect(getLocalPantryTermTranslation('Milk', 'ja')).toBe('牛乳');
    expect(getLocalPantryTermTranslation('Fish Cake', 'ja')).toBe('魚のすり身');
    expect(getLocalPantryTermTranslation('Ice Cream', 'vi')).toBe('kem');
  });

  it('normalizes common descriptors and plurals', () => {
    expect(normalizePantryTerm('Organic Eggs')).toBe('egg');
    expect(normalizePantryTerm('baby spinach')).toBe('spinach');
    expect(normalizePantryTerm('Fresh Tomatoes')).toBe('tomato');
  });

  it('keeps multi-word foods whose names contain a descriptor word', () => {
    // "ground" and "sour" are descriptor words, but these foods have their own
    // dictionary entries that must win before descriptor stripping.
    expect(getLocalPantryTermTranslation('Ground Beef', 'ko')).toBe('다진 소고기');
    expect(getLocalPantryTermTranslation('Sour Cream', 'fr')).toBe('crème aigre');
    expect(normalizePantryTerm('Ground Beef')).toBe('ground beef');
  });

  it('translates aliases through shared entries', () => {
    expect(getLocalPantryTermTranslation('scallion', 'ja')).toBe('ねぎ');
    expect(getLocalPantryTermTranslation('green onion', 'ja')).toBe('ねぎ');
    expect(getLocalPantryTermTranslation('coriander', 'es')).toBe('cilantro');
  });
});

describe('translateTerms', () => {
  beforeEach(() => {
    clearTermTranslationClientCache();
    asyncStorageMock.getItem.mockReset().mockResolvedValue(null);
    asyncStorageMock.removeItem.mockReset();
    asyncStorageMock.setItem.mockReset().mockResolvedValue(undefined);
    supabaseFunctionsMock.invoke.mockReset();
  });

  it('uses local pantry translations before cache or provider calls', async () => {
    const result = await translateTerms(['Egg', 'Milk', 'Fish Cake', 'Ice Cream'], 'ja');

    expect(result).toEqual({
      Egg: '卵',
      Milk: '牛乳',
      'Fish Cake': '魚のすり身',
      'Ice Cream': 'アイスクリーム',
    });
    expect(asyncStorageMock.getItem).not.toHaveBeenCalled();
    expect(supabaseFunctionsMock.invoke).not.toHaveBeenCalled();
  });

  it('only sends local misses to the term translation function', async () => {
    supabaseFunctionsMock.invoke.mockResolvedValue({
      data: { terms: { Gochujang: 'コチュジャン' } },
      error: null,
    });

    const result = await translateTerms(['Milk', 'Gochujang'], 'ja');

    expect(result).toEqual({
      Milk: '牛乳',
      Gochujang: 'コチュジャン',
    });
    expect(supabaseFunctionsMock.invoke).toHaveBeenCalledWith('generate-recipes', {
      body: { translate: { targetLanguage: 'ja', terms: ['Gochujang'] } },
    });
  });
});
