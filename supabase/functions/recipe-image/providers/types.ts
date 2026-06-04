export type FoodImageProviderName = 'openai' | 'pexels';

export type FoodImage = {
  alt?: string;
  imageUrl: string;
  photographer?: string;
  photographerUrl?: string;
  provider: FoodImageProviderName;
};

export type FoodImageProvider = {
  name: FoodImageProviderName;
  search: (query: string) => Promise<FoodImage | null>;
};
