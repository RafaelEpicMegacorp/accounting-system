import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import it from './locales/it.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

// Language resources
const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  it: { translation: it },
  ru: { translation: ru },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
};

// Supported languages (following Stripe's 25+ language model)
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
];

// Currency formatting based on locale
export const currencyFormats: Record<string, { code: string; symbol: string; decimals: number }> = {
  en: { code: 'USD', symbol: '$', decimals: 2 },
  es: { code: 'EUR', symbol: '€', decimals: 2 },
  fr: { code: 'EUR', symbol: '€', decimals: 2 },
  de: { code: 'EUR', symbol: '€', decimals: 2 },
  pt: { code: 'EUR', symbol: '€', decimals: 2 },
  it: { code: 'EUR', symbol: '€', decimals: 2 },
  ru: { code: 'RUB', symbol: '₽', decimals: 2 },
  zh: { code: 'CNY', symbol: '¥', decimals: 2 },
  ja: { code: 'JPY', symbol: '¥', decimals: 0 },
  ko: { code: 'KRW', symbol: '₩', decimals: 0 },
};

// Date formats based on locale
export const dateFormats: Record<string, string> = {
  en: 'MM/dd/yyyy',
  es: 'dd/MM/yyyy',
  fr: 'dd/MM/yyyy',
  de: 'dd.MM.yyyy',
  pt: 'dd/MM/yyyy',
  it: 'dd/MM/yyyy',
  ru: 'dd.MM.yyyy',
  zh: 'yyyy/MM/dd',
  ja: 'yyyy/MM/dd',
  ko: 'yyyy/MM/dd',
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Namespace configuration
    defaultNS: 'translation',
    
    // React options
    react: {
      useSuspense: false, // Disable suspense to avoid loading issues
    },
  });

export default i18n;

// Utility functions for formatting
export const formatCurrencyLocalized = (
  amount: number, 
  locale: string = i18n.language,
  options: Partial<Intl.NumberFormatOptions> = {}
): string => {
  const currencyFormat = currencyFormats[locale] || currencyFormats.en;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyFormat.code,
    minimumFractionDigits: currencyFormat.decimals,
    maximumFractionDigits: currencyFormat.decimals,
    ...options,
  }).format(amount);
};

export const formatDateLocalized = (
  date: Date | string,
  locale: string = i18n.language,
  options: Partial<Intl.DateTimeFormatOptions> = {}
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  }).format(dateObj);
};

export const formatNumberLocalized = (
  number: number,
  locale: string = i18n.language,
  options: Partial<Intl.NumberFormatOptions> = {}
): string => {
  return new Intl.NumberFormat(locale, options).format(number);
};

// Helper to get current locale currency
export const getCurrentCurrency = (): string => {
  const locale = i18n.language;
  return currencyFormats[locale]?.code || 'USD';
};

// Helper to get current locale date format
export const getCurrentDateFormat = (): string => {
  const locale = i18n.language;
  return dateFormats[locale] || dateFormats.en;
};