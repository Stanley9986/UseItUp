import { useEffect, useMemo, useState } from 'react';

import { useAppLanguage } from '@/contexts/language-context';
import { translateTerms } from '@/lib/term-translation';

// Returns a map of original name -> translated name for the active app language.
// English is treated as the source language for item names, so no request is made
// when the active language is English. Look up with `map[name] ?? name`.
export function useTranslatedNames(names: string[]): Record<string, string> {
  const { languageCode } = useAppLanguage();
  const [map, setMap] = useState<Record<string, string>>({});

  const key = useMemo(() => Array.from(new Set(names)).sort().join('|'), [names]);

  useEffect(() => {
    if (languageCode === 'en' || !names.length) {
      setMap({});
      return;
    }

    let cancelled = false;

    translateTerms(names, languageCode)
      .then((result) => {
        if (!cancelled) {
          setMap(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMap({});
        }
      });

    return () => {
      cancelled = true;
    };
    // key captures the distinct name set; names is intentionally read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, languageCode]);

  return map;
}
