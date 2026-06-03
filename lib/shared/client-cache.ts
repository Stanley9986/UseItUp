import AsyncStorage from '@react-native-async-storage/async-storage';

// A small two-tier (in-memory + AsyncStorage) cache with per-entry TTL, used by
// the on-device image and translation caches. Entries are keyed by an arbitrary
// string; callers build the key (e.g. `${recipeId}:${language}`).

type CacheEntry<T> = {
  value: T;
  expiresAt: string;
};

export type ClientCache<T> = {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  clear(): void;
};

export function createClientCache<T>(options: {
  prefix: string;
  ttlMs: number;
  // Optional guard rejecting malformed/low-quality values on read and write.
  isValid?: (value: T) => boolean;
}): ClientCache<T> {
  const { prefix, ttlMs, isValid } = options;
  const memory = new Map<string, CacheEntry<T>>();

  const storageKey = (key: string) => `${prefix}${encodeURIComponent(key)}`;
  const isFresh = (entry: CacheEntry<T>) => new Date(entry.expiresAt).getTime() > Date.now();

  function parse(raw: string | null): CacheEntry<T> | null {
    if (!raw) {
      return null;
    }

    try {
      const entry = JSON.parse(raw) as Partial<CacheEntry<T>>;

      if (!entry.expiresAt || entry.value === undefined || entry.value === null) {
        return null;
      }

      if (isValid && !isValid(entry.value as T)) {
        return null;
      }

      return { value: entry.value as T, expiresAt: entry.expiresAt };
    } catch {
      return null;
    }
  }

  return {
    async get(key) {
      const memoryEntry = memory.get(key);

      if (memoryEntry && isFresh(memoryEntry)) {
        return memoryEntry.value;
      }

      if (memoryEntry) {
        memory.delete(key);
      }

      try {
        const entry = parse(await AsyncStorage.getItem(storageKey(key)));

        if (!entry) {
          return null;
        }

        if (!isFresh(entry)) {
          await AsyncStorage.removeItem(storageKey(key));
          return null;
        }

        memory.set(key, entry);

        return entry.value;
      } catch {
        return null;
      }
    },

    async set(key, value) {
      if (isValid && !isValid(value)) {
        return;
      }

      const entry: CacheEntry<T> = {
        value,
        expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      };

      memory.set(key, entry);

      try {
        await AsyncStorage.setItem(storageKey(key), JSON.stringify(entry));
      } catch {
        // Local cache writes should not block rendering.
      }
    },

    clear() {
      memory.clear();
    },
  };
}
