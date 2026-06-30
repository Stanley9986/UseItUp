import { IntakePrompt, RecipePrompt, TermsPrompt, TranslationPrompt } from '../shared/prompt.ts';

export type RecipeProvider = {
  generate: (prompt: RecipePrompt) => Promise<unknown>;
  // Optional streaming variant: yields text fragments (partial recipe JSON) as
  // the model produces them. Providers that cannot stream omit this and the
  // Edge Function falls back to buffered `generate`.
  generateStream?: (prompt: RecipePrompt) => AsyncGenerator<string>;
  name: string;
  parseIntake: (prompt: IntakePrompt) => Promise<unknown>;
  translateRecipes: (prompt: TranslationPrompt) => Promise<unknown>;
  translateTerms: (prompt: TermsPrompt) => Promise<unknown>;
};
