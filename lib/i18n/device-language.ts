import { getLocales } from 'expo-localization';

import { defaultUserPreferences } from '@/lib/preferences/user-preferences-mappers';
import { normalizeLanguageCode } from '@/lib/i18n/languages';

export function getDefaultUserPreferencesForDevice() {
  const deviceLanguageCode = getLocales()[0]?.languageCode;

  return {
    ...defaultUserPreferences,
    languageCode: normalizeLanguageCode(deviceLanguageCode),
  };
}
