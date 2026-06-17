import { IntakePrompt, RecipePrompt, TermsPrompt, TranslationPrompt } from '../shared/prompt.ts';

export type RecipeProvider = {
  generate: (prompt: RecipePrompt) => Promise<unknown>;
  name: string;
  parseIntake: (prompt: IntakePrompt) => Promise<unknown>;
  translateRecipes: (prompt: TranslationPrompt) => Promise<unknown>;
  translateTerms: (prompt: TermsPrompt) => Promise<unknown>;
};
