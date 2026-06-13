import { useEffect, useMemo, useState } from 'react';

import { useAppLanguage } from '@/contexts/language-context';
import { itemNameNeedsTranslation, translateTerms } from '@/lib/i18n/term-translation';

// Returns a map of original name -> translated name for the active app language.
// English is treated as the source language, so no request is made when the
// active language is English. Use for names without a known source language
// (e.g. recipe titles, user-typed avoided ingredients). Look up with
// `map[name] ?? name`.
export function useTranslatedNames(names: string[]): Record<string, string> {
  return useTranslatedItemNames(useMemo(() => names.map((name) => ({ name })), [names]));
}

export type TranslatableItemName = {
  name: string;
  // Language the name was entered in. Undefined/null is treated as English to
  // match legacy rows created before pantry items tracked a source language.
  sourceLanguage?: string | null;
};

// Returns a map of original name -> translated name for the active app language,
// skipping names already stored in that language. Names whose source language
// matches the active language are left out of the map, so `map[name] ?? name`
// renders them unchanged without any network call. Names in another language are
// translated into the active one (including non-English names back into English).
export function useTranslatedItemNames(items: TranslatableItemName[]): Record<string, string> {
  const { languageCode } = useAppLanguage();
  const [map, setMap] = useState<Record<string, string>>({});

  const namesToTranslate = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .filter((item) => itemNameNeedsTranslation(item.sourceLanguage, languageCode))
            .map((item) => item.name),
        ),
      ),
    [items, languageCode],
  );

  const key = useMemo(() => namesToTranslate.slice().sort().join('|'), [namesToTranslate]);

  useEffect(() => {
    if (!namesToTranslate.length) {
      setMap({});
      return;
    }

    let cancelled = false;

    translateTerms(namesToTranslate, languageCode)
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
    // key captures the distinct name set; namesToTranslate is read fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, languageCode]);

  return map;
}
