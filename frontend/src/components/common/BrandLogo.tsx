type BrandLogoProps = {
    subtitle?: string;
    compact?: boolean;
    className?: string;
};

const BrandLogo = ({ subtitle, compact = false, className = '' }: BrandLogoProps) => (
    <div className={`flex items-center gap-3 ${className}`}>
        <img
            src="/assets/images/doha-events-splash.png"
            alt="Doha Events"
            className="w-10 h-10 rounded-xl object-cover shadow-premium"
        />
        {!compact && (
            <div className="min-w-0">
                <span className="block font-bold text-lg text-gray-900 tracking-tight leading-tight">
                    Doha Events
                </span>
                {subtitle && <span className="block text-xs text-gray-500 truncate">{subtitle}</span>}
            </div>
        )}
    </div>
);

export default BrandLogo;
