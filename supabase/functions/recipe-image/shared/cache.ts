export type CachedFoodImage = {
  alt?: string;
  imageUrl: string;
  photographer?: string;
  photographerUrl?: string;
  provider: 'pexels';
};

export type FoodImageCacheRecord = {
  alt?: string | null;
  expires_at: string;
  image_url: string;
  photographer?: string | null;
  photographer_url?: string | null;
  provider: 'pexels';
};

export const foodImageCacheTtlDays = 30;

export function normalizeImageQuery(query: string) {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function getFoodImageCacheExpiration(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + foodImageCacheTtlDays);

  return expiresAt.toISOString();
}

export function isFreshFoodImageCacheRecord(record: FoodImageCacheRecord, now = new Date()) {
  return new Date(record.expires_at).getTime() > now.getTime();
}

export function mapFoodImageCacheRecord(record: FoodImageCacheRecord): CachedFoodImage {
  return {
    alt: record.alt ?? undefined,
    imageUrl: record.image_url,
    photographer: record.photographer ?? undefined,
    photographerUrl: record.photographer_url ?? undefined,
    provider: record.provider,
  };
}

