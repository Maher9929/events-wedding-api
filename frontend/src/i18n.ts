import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import ar from './locales/ar.json';
import en from './locales/en.json';

type TranslationTree = Record<string, unknown>;

const normalizeLanguage = (value?: string | null) => {
    const code = value?.split('-')[0]?.toLowerCase();
    return code && ['ar', 'fr', 'en'].includes(code) ? code : 'ar';
};

const mergeTranslations = (base: TranslationTree, overrides: TranslationTree): TranslationTree => {
    const result: TranslationTree = { ...base };

    for (const [key, value] of Object.entries(overrides)) {
        const baseValue = result[key];
        if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            baseValue &&
            typeof baseValue === 'object' &&
            !Array.isArray(baseValue)
        ) {
            result[key] = mergeTranslations(baseValue as TranslationTree, value as TranslationTree);
        } else {
            result[key] = value;
        }
    }

    return result;
};

const storedLanguage =
    typeof window !== 'undefined'
        ? normalizeLanguage(window.localStorage.getItem('i18nextLng'))
        : undefined;

const resources = {
    ar: { translation: ar },
    en: { translation: mergeTranslations(ar as TranslationTree, en as TranslationTree) },
    fr: { translation: mergeTranslations(ar as TranslationTree, fr as TranslationTree) },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        supportedLngs: ['ar', 'fr', 'en'],
        nonExplicitSupportedLngs: true,
        cleanCode: true,
        load: 'languageOnly',
        lng: storedLanguage || 'ar',
        fallbackLng: 'ar',
        returnEmptyString: false,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage'],
            caches: ['localStorage'],
            convertDetectedLanguage: (lng: string) => normalizeLanguage(lng),
        },
    });

// Handle RTL for Arabic
i18n.on('languageChanged', (lng) => {
    const normalizedLanguage = normalizeLanguage(lng);
    document.documentElement.dir = normalizedLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = normalizedLanguage;
    window.localStorage.setItem('i18nextLng', normalizedLanguage);
});

// Set initial direction
const initialLng = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
document.documentElement.dir = initialLng === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = initialLng;

export default i18n;
