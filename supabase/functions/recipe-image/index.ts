// @ts-nocheck
import {
  getFoodImageCacheExpiration,
  isFreshFoodImageCacheRecord,
  mapFoodImageCacheRecord,
  normalizeImageQuery,
} from './shared/cache.ts';

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

function imageResponse(image: unknown, source: 'cache' | 'none' | 'pexels', cacheStatus: string) {
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
  provider: 'pexels';
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

  const apiKey = Deno.env.get('PEXELS_API_KEY');

  if (!apiKey) {
    return imageResponse(null, 'none', `${cachedImage.status}_missing_pexels_key`);
  }

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', '1');
  url.searchParams.set('locale', 'en-US');

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      return imageResponse(null, 'none', `${cachedImage.status}_pexels_failed_${response.status}`);
    }

    const payload = await response.json();
    const photo = Array.isArray(payload?.photos) ? payload.photos[0] : null;
    const imageUrl = photo?.src?.landscape ?? photo?.src?.large ?? photo?.src?.medium;

    if (!imageUrl) {
      return imageResponse(null, 'none', `${cachedImage.status}_no_pexels_image`);
    }

    const image = {
      alt: photo.alt,
      imageUrl,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      provider: 'pexels' as const,
    };

    const cacheWriteStatus = await cacheImage(query, image);

    return imageResponse(image, 'pexels', `${cachedImage.status}_${cacheWriteStatus}`);
  } catch {
    return imageResponse(null, 'none', `${cachedImage.status}_pexels_error`);
  }
});
