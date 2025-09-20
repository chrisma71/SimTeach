export const SUPPORTED_LANGUAGES = {
  'en': 'english',
  'es': 'spanish',
  'fr': 'french',
  'de': 'german',
  'it': 'italian',
  'pt': 'portuguese',
  'ru': 'russian',
  'ja': 'japanese',
  'ko': 'korean',
  'zh': 'chinese',
  'ar': 'arabic',
  'hi': 'hindi',
  'nl': 'dutch',
  'sv': 'swedish',
  'no': 'norwegian',
  'da': 'danish',
  'fi': 'finnish',
  'pl': 'polish',
  'tr': 'turkish',
  'th': 'thai',
  'vi': 'vietnamese'
} as const;

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES;
export type SupportedLanguageName = typeof SUPPORTED_LANGUAGES[SupportedLanguageCode];

export function getLanguageName(code: string): string {
  const normalizedCode = code.toLowerCase() as SupportedLanguageCode;
  return SUPPORTED_LANGUAGES[normalizedCode] || 'english';
}

export function isValidLanguageCode(code: string): boolean {
  return code.toLowerCase() in SUPPORTED_LANGUAGES;
}
