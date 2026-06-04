export type SupportedLanguageCode =
  | 'en'
  | 'es'
  | 'zh'
  | 'fr'
  | 'de'
  | 'it'
  | 'ja'
  | 'ko'
  | 'pt'
  | 'vi';

export type SupportedLanguage = {
  code: SupportedLanguageCode;
  label: string;
  autonym: string;
  promptName: string;
};

export const defaultLanguageCode: SupportedLanguageCode = 'en';

export const supportedLanguages: SupportedLanguage[] = [
  { code: 'en', label: 'English', autonym: 'English', promptName: 'English' },
  { code: 'es', label: 'Spanish', autonym: 'Español', promptName: 'Spanish' },
  { code: 'zh', label: 'Chinese', autonym: '中文', promptName: 'Chinese' },
  { code: 'fr', label: 'French', autonym: 'Français', promptName: 'French' },
  { code: 'de', label: 'German', autonym: 'Deutsch', promptName: 'German' },
  { code: 'it', label: 'Italian', autonym: 'Italiano', promptName: 'Italian' },
  { code: 'ja', label: 'Japanese', autonym: '日本語', promptName: 'Japanese' },
  { code: 'ko', label: 'Korean', autonym: '한국어', promptName: 'Korean' },
  { code: 'pt', label: 'Portuguese', autonym: 'Português', promptName: 'Portuguese' },
  { code: 'vi', label: 'Vietnamese', autonym: 'Tiếng Việt', promptName: 'Vietnamese' },
];

const supportedLanguageByCode = new Map(supportedLanguages.map((language) => [language.code, language]));

export function normalizeLanguageCode(value: unknown): SupportedLanguageCode {
  if (typeof value !== 'string') {
    return defaultLanguageCode;
  }

  const normalized = value.trim().toLowerCase().split('-')[0];

  return isSupportedLanguageCode(normalized) ? normalized : defaultLanguageCode;
}

export function getLanguageOption(value: unknown): SupportedLanguage {
  return supportedLanguageByCode.get(normalizeLanguageCode(value)) ?? supportedLanguages[0];
}

function isSupportedLanguageCode(value: string): value is SupportedLanguageCode {
  return supportedLanguageByCode.has(value as SupportedLanguageCode);
}
