import { createClientCache } from '@/lib/shared/client-cache';
import { getRecipeImageSearchQuery, RecipeArtwork } from '@/lib/recipes/recipe-artwork';
import { supabase } from '@/lib/shared/supabase';
import { Recipe } from '@/types/useitup';

type RecipeImageResponse = {
  cache?: {
    status: string;
  };
  image?: {
    alt?: string;
    imageUrl: string;
    photographer?: string;
    photographerUrl?: string;
    provider: 'openai' | 'pexels';
  } | null;
  source?: 'cache' | 'none' | 'openai' | 'pexels';
};

const imageCache = createClientCache<RecipeArtwork>({
  prefix: 'useitup:recipe-image-cache:',
  ttlMs: 30 * 24 * 60 * 60 * 1000,
  isValid: (artwork) => Boolean(artwork.imageUrl) && isRemoteArtworkProvider(artwork.provider),
});
const pendingImageRequests = new Map<string, Promise<RecipeArtwork | null>>();

export async function getRemoteRecipeArtwork(recipe: Recipe): Promise<RecipeArtwork | null> {
  return getRemoteRecipeArtworkForQuery(getRecipeImageSearchQuery(recipe), recipe.title);
}

export async function getRemoteRecipeArtworkForQuery(query: string, label: string): Promise<RecipeArtwork | null> {
  const normalizedQuery = normalizeRecipeImageQuery(query);

  if (!normalizedQuery) {
    return null;
  }

  const cachedArtwork = await imageCache.get(normalizedQuery);

  if (cachedArtwork) {
    return cachedArtwork;
  }

  const pendingRequest = pendingImageRequests.get(normalizedQuery);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = fetchAndCacheRecipeArtwork(normalizedQuery, label);
  pendingImageRequests.set(normalizedQuery, request);

  try {
    return await request;
  } finally {
    pendingImageRequests.delete(normalizedQuery);
  }
}

export function clearRecipeImageClientCache() {
  imageCache.clear();
  pendingImageRequests.clear();
}

function normalizeRecipeImageQuery(query: string) {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isRemoteArtworkProvider(provider: unknown) {
  return provider === 'openai' || provider === 'pexels';
}

async function fetchAndCacheRecipeArtwork(query: string, label: string) {
  const { data, error } = await supabase.functions.invoke<RecipeImageResponse>('recipe-image', {
    body: { query },
  });

  if (error || !data?.image?.imageUrl) {
    return null;
  }

  const artwork: RecipeArtwork = {
    category: 'vegetable',
    imageUrl: data.image.imageUrl,
    label: data.image.alt || label,
    photographer: data.image.photographer,
    photographerUrl: data.image.photographerUrl,
    provider: data.image.provider,
  };

  await imageCache.set(query, artwork);

  return artwork;
}
