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
  promptName: string;
};

export const defaultLanguageCode: SupportedLanguageCode = 'en';

export const supportedLanguages: SupportedLanguage[] = [
  { code: 'en', label: 'English', promptName: 'English' },
  { code: 'es', label: 'Spanish', promptName: 'Spanish' },
  { code: 'zh', label: 'Chinese', promptName: 'Chinese' },
  { code: 'fr', label: 'French', promptName: 'French' },
  { code: 'de', label: 'German', promptName: 'German' },
  { code: 'it', label: 'Italian', promptName: 'Italian' },
  { code: 'ja', label: 'Japanese', promptName: 'Japanese' },
  { code: 'ko', label: 'Korean', promptName: 'Korean' },
  { code: 'pt', label: 'Portuguese', promptName: 'Portuguese' },
  { code: 'vi', label: 'Vietnamese', promptName: 'Vietnamese' },
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
