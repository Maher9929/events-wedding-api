import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

const normalizeLanguage = (value?: string | null) => {
    const code = value?.split('-')[0]?.toLowerCase();
    return code && ['ar', 'fr', 'en'].includes(code) ? code : 'ar';
};

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const languages = [
        { code: 'ar', name: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', shortName: 'AR' },
        { code: 'fr', name: 'Francais', shortName: 'FR' },
        { code: 'en', name: 'English', shortName: 'EN' },
    ];

    const currentCode = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
    const currentLanguage = languages.find((lang) => lang.code === currentCode) || languages[0];

    const updatePosition = useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + 8,
                left: rect.right - 160,
            });
        }
    }, []);

    useEffect(() => {
        if (open) updatePosition();
    }, [open, updatePosition]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                buttonRef.current && !buttonRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all text-sm font-medium border border-gray-100"
            >
                <span>{currentLanguage.name}</span>
                <span className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                    {currentLanguage.shortName}
                </span>
                <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}></i>
            </button>

            {open && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed w-40 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 animate-fade-in-up"
                    style={{ top: pos.top, left: Math.max(8, pos.left), zIndex: 9999 }}
                >
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                                window.localStorage.setItem('i18nextLng', lang.code);
                                void i18n.changeLanguage(lang.code);
                                setOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-bglight transition-colors ${
                                currentCode === lang.code ? 'text-primary font-bold bg-purple-50' : 'text-gray-600'
                            }`}
                            dir={lang.code === 'ar' ? 'rtl' : 'ltr'}
                        >
                            <span className="flex-1">{lang.name}</span>
                            <span className="rounded-md border border-gray-100 bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">
                                {lang.shortName}
                            </span>
                            {currentCode === lang.code && <i className="fa-solid fa-check text-primary text-xs"></i>}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};

export default LanguageSwitcher;
