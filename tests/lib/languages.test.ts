import { describe, expect, it } from 'vitest';

import { getLanguageOption, normalizeLanguageCode } from '@/lib/languages';
import { translate } from '@/lib/translations';

describe('language helpers', () => {
  it('normalizes supported language and locale codes', () => {
    expect(normalizeLanguageCode('es')).toBe('es');
    expect(normalizeLanguageCode('pt-BR')).toBe('pt');
    expect(normalizeLanguageCode('ZH-hans')).toBe('zh');
  });

  it('falls back to English for unsupported values', () => {
    expect(normalizeLanguageCode('xx')).toBe('en');
    expect(normalizeLanguageCode(null)).toBe('en');
  });

  it('returns display metadata for a language', () => {
    expect(getLanguageOption('ko')).toEqual({
      code: 'ko',
      label: 'Korean',
      promptName: 'Korean',
    });
  });

  it('translates app copy with English fallback for missing language keys', () => {
    expect(translate('es', 'appLanguage')).toBe('Idioma de la app');
    expect(translate('fr', 'account')).toBe('Account');
  });

  it('interpolates translated app copy', () => {
    expect(translate('en', 'pantryItemsReady', { count: 3 })).toBe('3 pantry items ready for recipe generation.');
    expect(translate('es', 'itemsNeedAttention', { count: 2, plural: 's', verb: 'requieren' })).toBe(
      '2 alimentos requieren atención',
    );
  });

  it('translates newly localized screen controls', () => {
    expect(translate('es', 'savePantryUpdates')).toBe('Guardar cambios de despensa');
    expect(translate('es', 'vegetarian')).toBe('Vegetariano');
    expect(translate('es', 'recipeDetailFallbackLoadError')).toBe(
      'No se pudo cargar la receta guardada. Mostrando una receta de ejemplo.',
    );
  });
});
