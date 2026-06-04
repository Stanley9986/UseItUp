import { FoodImageProvider } from './types.ts';

export const pexelsImageProvider: FoodImageProvider = {
  name: 'pexels',
  search: searchPexelsImage,
};

async function searchPexelsImage(query: string) {
  const apiKey = Deno.env.get('PEXELS_API_KEY');

  if (!apiKey) {
    throw new Error('Missing PEXELS_API_KEY secret');
  }

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', '1');
  url.searchParams.set('locale', 'en-US');

  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Pexels request failed (${response.status})`);
  }

  const payload = await response.json();
  const photo = Array.isArray(payload?.photos) ? payload.photos[0] : null;
  const imageUrl = photo?.src?.landscape ?? photo?.src?.large ?? photo?.src?.medium;

  if (!imageUrl) {
    return null;
  }

  return {
    alt: photo.alt,
    imageUrl,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    provider: 'pexels' as const,
  };
}
