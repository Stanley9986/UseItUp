import { TranslationKey } from '@/lib/i18n/translations';
import { getErrorMessage } from '@/lib/shared/errors';

type Translate = (key: TranslationKey) => string;

export class RecipeGenerationError extends Error {
  code?: string;
  retryAfterSeconds?: number;

  constructor(message: string, options: { code?: string; retryAfterSeconds?: number } = {}) {
    super(message);
    this.name = 'RecipeGenerationError';
    this.code = options.code;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export function getRecipeGenerationErrorKey(error: unknown): TranslationKey | null {
  if (error instanceof RecipeGenerationError) {
    switch (error.code) {
      case 'generation_rate_limited':
        return 'recipeGenerationLimited';
      case 'provider_rate_limited':
        return 'recipeGenerationBusy';
      case 'provider_unavailable':
      case 'provider_config_error':
        return 'recipeGenerationUnavailable';
      default:
        return 'unableToGenerateRecipes';
    }
  }

  return null;
}

export function getRecipeGenerationErrorMessage(error: unknown, t: Translate) {
  const key = getRecipeGenerationErrorKey(error);

  return key ? t(key) : getErrorMessage(error, t('unableToGenerateRecipes'));
}
