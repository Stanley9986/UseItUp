// @ts-nocheck
import {
  getFoodImageCacheExpiration,
  isFreshFoodImageCacheRecord,
  mapFoodImageCacheRecord,
  normalizeImageQuery,
} from './shared/cache.ts';
import { getImageProvider } from './providers/index.ts';
import { FoodImage } from './providers/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  });
}

function imageResponse(image: unknown, source: 'cache' | 'none' | 'openai' | 'pexels', cacheStatus: string) {
  return jsonResponse({
    cache: {
      status: cacheStatus,
    },
    image,
    source,
  });
}

function getSupabaseCacheConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    restUrl: `${supabaseUrl}/rest/v1/food_image_cache`,
  };
}

async function getCachedImage(query: string) {
  const cacheConfig = getSupabaseCacheConfig();

  if (!cacheConfig) {
    return { image: null, status: 'disabled' };
  }

  const url = new URL(cacheConfig.restUrl);
  url.searchParams.set('query', `eq.${query}`);
  url.searchParams.set('select', 'image_url,alt,photographer,photographer_url,provider,expires_at');
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url, {
      headers: cacheConfig.headers,
    });

    if (!response.ok) {
      return { image: null, status: `read_failed_${response.status}` };
    }

    const records = await response.json();
    const record = Array.isArray(records) ? records[0] : null;

    if (!record || !isFreshFoodImageCacheRecord(record)) {
      return { image: null, status: record ? 'expired' : 'miss' };
    }

    return { image: mapFoodImageCacheRecord(record), status: 'hit' };
  } catch {
    return { image: null, status: 'read_error' };
  }
}

async function cacheImage(query: string, image: {
  alt?: string;
  imageUrl: string;
  photographer?: string;
  photographerUrl?: string;
  provider: FoodImage['provider'];
}) {
  const cacheConfig = getSupabaseCacheConfig();

  if (!cacheConfig) {
    return 'write_disabled';
  }

  const url = new URL(cacheConfig.restUrl);
  url.searchParams.set('on_conflict', 'query');

  try {
    const response = await fetch(url, {
      body: JSON.stringify({
        alt: image.alt ?? null,
        expires_at: getFoodImageCacheExpiration(),
        image_url: image.imageUrl,
        photographer: image.photographer ?? null,
        photographer_url: image.photographerUrl ?? null,
        provider: image.provider,
        query,
        updated_at: new Date().toISOString(),
      }),
      headers: {
        ...cacheConfig.headers,
        Prefer: 'resolution=merge-duplicates',
      },
      method: 'POST',
    });

    if (!response.ok) {
      return `write_failed_${response.status}`;
    }

    return 'write_succeeded';
  } catch {
    // Cache writes should not block image responses.
    return 'write_error';
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const body = await request.json().catch(() => null);
  const query = typeof body?.query === 'string' ? normalizeImageQuery(body.query) : '';

  if (!query) {
    return imageResponse(null, 'none', 'empty_query');
  }

  const cachedImage = await getCachedImage(query);

  if (cachedImage.image) {
    return imageResponse(cachedImage.image, 'cache', cachedImage.status);
  }

  const provider = getImageProvider(Deno.env.get('IMAGE_PROVIDER') ?? 'pexels');

  try {
    const image = await provider.search(query);

    if (!image) {
      return imageResponse(null, 'none', `${cachedImage.status}_no_${provider.name}_image`);
    }

    const cacheWriteStatus = await cacheImage(query, image);

    return imageResponse(image, provider.name, `${cachedImage.status}_${cacheWriteStatus}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : `${provider.name} image lookup failed`;

    return imageResponse(
      { error: message },
      'none',
      `${cachedImage.status}_${provider.name}_error`,
    );
  }
});
