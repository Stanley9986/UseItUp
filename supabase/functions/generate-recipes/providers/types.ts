import { RecipePrompt, TermsPrompt, TranslationPrompt } from '../shared/prompt.ts';

export type RecipeProvider = {
  generate: (prompt: RecipePrompt) => Promise<unknown>;
  name: string;
  translateRecipes: (prompt: TranslationPrompt) => Promise<unknown>;
  translateTerms: (prompt: TermsPrompt) => Promise<unknown>;
};
