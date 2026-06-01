import AsyncStorage from '@react-native-async-storage/async-storage';

import { getRecipeImageSearchQuery, RecipeArtwork } from '@/lib/recipe-artwork';
import { supabase } from '@/lib/supabase';
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
    provider: 'pexels';
  } | null;
  source?: 'cache' | 'none' | 'pexels';
};

type ClientRecipeImageCacheEntry = {
  artwork: RecipeArtwork & { imageUrl: string; provider: 'pexels' };
  expiresAt: string;
};

const recipeImageClientCachePrefix = 'useitup:recipe-image-cache:';
const recipeImageClientCacheTtlMs = 30 * 24 * 60 * 60 * 1000;
const memoryImageCache = new Map<string, ClientRecipeImageCacheEntry>();
const pendingImageRequests = new Map<string, Promise<RecipeArtwork | null>>();

export async function getRemoteRecipeArtwork(recipe: Recipe): Promise<RecipeArtwork | null> {
  return getRemoteRecipeArtworkForQuery(getRecipeImageSearchQuery(recipe), recipe.title);
}

export async function getRemoteRecipeArtworkForQuery(query: string, label: string): Promise<RecipeArtwork | null> {
  const normalizedQuery = normalizeRecipeImageQuery(query);

  if (!normalizedQuery) {
    return null;
  }

  const cachedArtwork = await getCachedRecipeArtwork(normalizedQuery);

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
  memoryImageCache.clear();
  pendingImageRequests.clear();
}

function normalizeRecipeImageQuery(query: string) {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
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

  await setCachedRecipeArtwork(query, artwork);

  return artwork;
}

async function getCachedRecipeArtwork(query: string) {
  const memoryEntry = memoryImageCache.get(query);

  if (memoryEntry && isFreshCacheEntry(memoryEntry)) {
    return memoryEntry.artwork;
  }

  if (memoryEntry) {
    memoryImageCache.delete(query);
  }

  try {
    const rawEntry = await AsyncStorage.getItem(getRecipeImageClientCacheKey(query));
    const storageEntry = parseCacheEntry(rawEntry);

    if (!storageEntry) {
      return null;
    }

    if (!isFreshCacheEntry(storageEntry)) {
      await AsyncStorage.removeItem(getRecipeImageClientCacheKey(query));
      return null;
    }

    memoryImageCache.set(query, storageEntry);

    return storageEntry.artwork;
  } catch {
    return null;
  }
}

async function setCachedRecipeArtwork(query: string, artwork: RecipeArtwork) {
  if (!artwork.imageUrl || artwork.provider !== 'pexels') {
    return;
  }

  const entry: ClientRecipeImageCacheEntry = {
    artwork: {
      ...artwork,
      imageUrl: artwork.imageUrl,
      provider: artwork.provider,
    },
    expiresAt: new Date(Date.now() + recipeImageClientCacheTtlMs).toISOString(),
  };

  memoryImageCache.set(query, entry);

  try {
    await AsyncStorage.setItem(getRecipeImageClientCacheKey(query), JSON.stringify(entry));
  } catch {
    // Local cache writes should not block artwork rendering.
  }
}

function getRecipeImageClientCacheKey(query: string) {
  return `${recipeImageClientCachePrefix}${encodeURIComponent(query)}`;
}

function isFreshCacheEntry(entry: ClientRecipeImageCacheEntry) {
  return new Date(entry.expiresAt).getTime() > Date.now();
}

function parseCacheEntry(rawEntry: string | null): ClientRecipeImageCacheEntry | null {
  if (!rawEntry) {
    return null;
  }

  try {
    const entry = JSON.parse(rawEntry) as Partial<ClientRecipeImageCacheEntry>;

    if (
      !entry.expiresAt ||
      !entry.artwork?.imageUrl ||
      entry.artwork.provider !== 'pexels'
    ) {
      return null;
    }

    return {
      artwork: entry.artwork,
      expiresAt: entry.expiresAt,
    };
  } catch {
    return null;
  }
}
