import { RecipePrompt } from '../shared/prompt.ts';

export type RecipeProvider = {
  generate: (prompt: RecipePrompt) => Promise<unknown>;
  name: string;
};
