import { getLocales } from 'expo-localization';

import { defaultUserPreferences } from '@/lib/user-preferences-mappers';
import { normalizeLanguageCode } from '@/lib/languages';

export function getDefaultUserPreferencesForDevice() {
  const deviceLanguageCode = getLocales()[0]?.languageCode;

  return {
    ...defaultUserPreferences,
    languageCode: normalizeLanguageCode(deviceLanguageCode),
  };
}
