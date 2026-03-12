import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const languages = [
        { code: 'fr', name: 'Français' },
        { code: 'ar', name: 'العربية' },
        { code: 'en', name: 'English' },
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    return (
        <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all text-sm font-medium border border-gray-100">
                <Globe className="w-4 h-4 text-primary" />
                <span>{currentLanguage.name}</span>
                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 group-hover:rotate-180 transition-transform"></i>
            </button>

            <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-50 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[60]">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => i18n.changeLanguage(lang.code)}
                        className={`w-full text-start px-4 py-2 text-sm hover:bg-bglight transition-colors ${i18n.language === lang.code ? 'text-primary font-bold' : 'text-gray-600'
                            }`}
                        dir={lang.code === 'ar' ? 'rtl' : 'ltr'}
                    >
                        {lang.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LanguageSwitcher;
