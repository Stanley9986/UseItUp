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
import {
  clearTermTranslationClientCache,
  itemNameNeedsTranslation,
  translateTerms,
} from '@/lib/i18n/term-translation';

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

  it('translates a non-English source name back into English', () => {
    // Scenario C: a Chinese-entered name viewed in English.
    expect(getLocalPantryTermTranslation('番茄', 'en', 'zh')).toBe('tomato');
    expect(getLocalPantryTermTranslation('牛乳', 'en', 'ja')).toBe('milk');
    expect(getLocalPantryTermTranslation('cebolla', 'en', 'es')).toBe('onion');
  });

  it('translates between two non-English languages via the English pivot', () => {
    // A Chinese-entered name viewed in Japanese.
    expect(getLocalPantryTermTranslation('番茄', 'ja', 'zh')).toBe('トマト');
    expect(getLocalPantryTermTranslation('cà rốt', 'ko', 'vi')).toBe('당근');
  });

  it('resolves alternate regional source names to the English pivot', () => {
    // 西红柿 is a second valid Chinese name for tomato alongside canonical 番茄.
    expect(getLocalPantryTermTranslation('西红柿', 'ja', 'zh')).toBe('トマト');
    expect(getLocalPantryTermTranslation('patata', 'de', 'es')).toBe('Kartoffel');
  });

  it('leaves an English source unchanged when viewed in English', () => {
    expect(getLocalPantryTermTranslation('Tomato', 'en')).toBeNull();
    expect(getLocalPantryTermTranslation('Tomato', 'en', 'en')).toBeNull();
  });

  it('falls back to an English-key match when the source tag is wrong', () => {
    // Tagged Chinese but actually an English name.
    expect(getLocalPantryTermTranslation('tomato', 'ja', 'zh')).toBe('トマト');
  });
});

describe('itemNameNeedsTranslation', () => {
  it('skips names already in the active language', () => {
    // Scenario B: a Chinese-entered name viewed in Chinese needs no translation.
    expect(itemNameNeedsTranslation('zh', 'zh')).toBe(false);
    expect(itemNameNeedsTranslation('en', 'en')).toBe(false);
  });

  it('translates names whose source differs from the active language', () => {
    // Scenario A (en -> zh) and Scenario C (zh -> en) both need translation.
    expect(itemNameNeedsTranslation('en', 'zh')).toBe(true);
    expect(itemNameNeedsTranslation('zh', 'en')).toBe(true);
    expect(itemNameNeedsTranslation('zh', 'ja')).toBe(true);
  });

  it('treats unknown source as English for legacy rows', () => {
    expect(itemNameNeedsTranslation(null, 'en')).toBe(false);
    expect(itemNameNeedsTranslation(undefined, 'en')).toBe(false);
    expect(itemNameNeedsTranslation(null, 'zh')).toBe(true);
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

  it('uses source languages to resolve non-English names locally', async () => {
    const result = await translateTerms(['番茄', 'cebolla'], 'en', {
      番茄: 'zh',
      cebolla: 'es',
    });

    expect(result).toEqual({ 番茄: 'tomato', cebolla: 'onion' });
    expect(supabaseFunctionsMock.invoke).not.toHaveBeenCalled();
  });
});
