import { Outlet } from 'react-router-dom';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

const AuthLayout = () => {
    return (
        <div className="min-h-screen bg-bglight flex items-center justify-center p-4 font-tajawal relative">
            <div className="absolute top-5 right-5">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                        <i className="fa-solid fa-ring text-white text-3xl"></i>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Events Marketplace</h1>
                </div>

                <Outlet />
            </div>
        </div>
    );
};

export default AuthLayout;
