import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { defaultLanguageCode, normalizeLanguageCode, SupportedLanguageCode } from '@/lib/i18n/languages';
import { translate, TranslationKey } from '@/lib/i18n/translations';
import { getUserPreferences } from '@/lib/preferences/user-preferences';

type LanguageContextValue = {
  languageCode: SupportedLanguageCode;
  setLanguageCode: (languageCode: string) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  languageCode: defaultLanguageCode,
  setLanguageCode: () => undefined,
  t: (key) => translate(defaultLanguageCode, key),
});

export function LanguageProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [languageCode, setLanguageCodeState] = useState<SupportedLanguageCode>(defaultLanguageCode);

  useEffect(() => {
    let isMounted = true;

    async function loadLanguage() {
      if (!user) {
        setLanguageCodeState(defaultLanguageCode);
        return;
      }

      try {
        const preferences = await getUserPreferences(user.id);

        if (isMounted) {
          setLanguageCodeState(normalizeLanguageCode(preferences.languageCode));
        }
      } catch {
        if (isMounted) {
          setLanguageCodeState(defaultLanguageCode);
        }
      }
    }

    loadLanguage();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const setLanguageCode = useCallback((nextLanguageCode: string) => {
    setLanguageCodeState(normalizeLanguageCode(nextLanguageCode));
  }, []);

  const value = useMemo(
    () => ({
      languageCode,
      setLanguageCode,
      t: (key: TranslationKey, params?: Record<string, string | number>) => translate(languageCode, key, params),
    }),
    [languageCode, setLanguageCode],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage() {
  return useContext(LanguageContext);
}
