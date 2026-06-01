import { beforeEach, describe, expect, it, vi } from 'vitest';

const asyncStorageMock = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));

const supabaseFunctionsMock = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: asyncStorageMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: supabaseFunctionsMock,
  },
}));

import { clearRecipeImageClientCache, getRemoteRecipeArtworkForQuery } from '@/lib/recipe-image';

describe('recipe image client cache', () => {
  beforeEach(() => {
    vi.useRealTimers();
    clearRecipeImageClientCache();
    asyncStorageMock.getItem.mockReset();
    asyncStorageMock.removeItem.mockReset();
    asyncStorageMock.setItem.mockReset();
    supabaseFunctionsMock.invoke.mockReset();
  });

  it('returns persisted cached artwork without invoking the Edge Function', async () => {
    asyncStorageMock.getItem.mockResolvedValue(
      JSON.stringify({
        artwork: {
          category: 'vegetable',
          imageUrl: 'https://images.pexels.com/spinach.jpg',
          label: 'Spinach',
          provider: 'pexels',
        },
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    );

    await expect(getRemoteRecipeArtworkForQuery('Baby Spinach Produce Food Ingredient', 'Spinach')).resolves.toMatchObject({
      imageUrl: 'https://images.pexels.com/spinach.jpg',
      provider: 'pexels',
    });

    expect(asyncStorageMock.getItem).toHaveBeenCalledWith(
      'useitup:recipe-image-cache:baby%20spinach%20produce%20food%20ingredient',
    );
    expect(supabaseFunctionsMock.invoke).not.toHaveBeenCalled();
  });

  it('caches successful Edge Function artwork responses', async () => {
    asyncStorageMock.getItem.mockResolvedValue(null);
    supabaseFunctionsMock.invoke.mockResolvedValue({
      data: {
        image: {
          alt: 'Fresh spinach',
          imageUrl: 'https://images.pexels.com/spinach.jpg',
          provider: 'pexels',
        },
      },
      error: null,
    });

    await expect(getRemoteRecipeArtworkForQuery('Baby Spinach', 'Spinach')).resolves.toMatchObject({
      imageUrl: 'https://images.pexels.com/spinach.jpg',
      label: 'Fresh spinach',
      provider: 'pexels',
    });

    expect(supabaseFunctionsMock.invoke).toHaveBeenCalledWith('recipe-image', {
      body: { query: 'baby spinach' },
    });
    expect(asyncStorageMock.setItem).toHaveBeenCalledWith(
      'useitup:recipe-image-cache:baby%20spinach',
      expect.stringContaining('https://images.pexels.com/spinach.jpg'),
    );
  });

  it('dedupes concurrent requests for the same image query', async () => {
    asyncStorageMock.getItem.mockResolvedValue(null);
    supabaseFunctionsMock.invoke.mockResolvedValue({
      data: {
        image: {
          alt: 'Fresh spinach',
          imageUrl: 'https://images.pexels.com/spinach.jpg',
          provider: 'pexels',
        },
      },
      error: null,
    });

    const [firstArtwork, secondArtwork] = await Promise.all([
      getRemoteRecipeArtworkForQuery('Baby Spinach', 'Spinach'),
      getRemoteRecipeArtworkForQuery('  baby   spinach ', 'Spinach'),
    ]);

    expect(firstArtwork?.imageUrl).toBe('https://images.pexels.com/spinach.jpg');
    expect(secondArtwork?.imageUrl).toBe('https://images.pexels.com/spinach.jpg');
    expect(supabaseFunctionsMock.invoke).toHaveBeenCalledTimes(1);
  });

  it('removes stale persisted entries before fetching fresh artwork', async () => {
    asyncStorageMock.getItem.mockResolvedValue(
      JSON.stringify({
        artwork: {
          category: 'vegetable',
          imageUrl: 'https://images.pexels.com/old.jpg',
          label: 'Old spinach',
          provider: 'pexels',
        },
        expiresAt: '2000-01-01T00:00:00.000Z',
      }),
    );
    supabaseFunctionsMock.invoke.mockResolvedValue({
      data: {
        image: {
          alt: 'Fresh spinach',
          imageUrl: 'https://images.pexels.com/new.jpg',
          provider: 'pexels',
        },
      },
      error: null,
    });

    await expect(getRemoteRecipeArtworkForQuery('Baby Spinach', 'Spinach')).resolves.toMatchObject({
      imageUrl: 'https://images.pexels.com/new.jpg',
    });

    expect(asyncStorageMock.removeItem).toHaveBeenCalledWith('useitup:recipe-image-cache:baby%20spinach');
    expect(supabaseFunctionsMock.invoke).toHaveBeenCalledTimes(1);
  });
});
