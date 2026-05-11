import { Outlet } from 'react-router-dom';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import BrandLogo from '../components/common/BrandLogo';

const AuthLayout = () => {
    return (
        <div className="min-h-screen bg-bglight flex items-center justify-center p-4 font-tajawal relative">
            <div className="absolute top-5 right-5">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center">
                    <BrandLogo subtitle="Events Marketplace" />
                </div>

                <Outlet />
            </div>
        </div>
    );
};

export default AuthLayout;
