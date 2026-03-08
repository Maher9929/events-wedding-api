import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { toastService } from '../services/toast.service';

const SignupPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { register, isAuthenticated, user } = useAuth();

    useEffect(() => {
        document.title = `${t('auth.signup.title')} | DOUSHA`;
    }, [t]);

    useEffect(() => {
        if (isAuthenticated && user) {
            if (user.role === 'provider') navigate('/provider/dashboard', { replace: true });
            else if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
            else navigate('/client/dashboard', { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<'client' | 'provider'>('client');

    const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        const fullName = fd.get('full_name') as string;
        const email = fd.get('email') as string;
        const password = fd.get('password') as string;

        try {
            const res = await register(email, password, fullName, role);
            toastService.success(t('auth.signup.success'));
            const userRole = res?.user?.role || role;
            if (userRole === 'provider') navigate('/provider/dashboard');
            else navigate('/client/dashboard');
        } catch (err: any) {
            const errorMsg = err.message || t('auth.signup.error');
            setError(errorMsg);
            toastService.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.signup.title')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('auth.signup.subtitle')}</p>

            {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl">{error}</p>}

            <form onSubmit={handleSignup} className="space-y-4">
                <input type="text" name="full_name" placeholder={t('auth.signup.full_name')} className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20" required />
                <input type="email" name="email" placeholder={t('auth.login.email')} className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20" required />
                <input type="password" name="password" placeholder={t('auth.login.password')} className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20" required />

                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setRole('client')}
                        className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${role === 'client' ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600'
                            }`}>
                        <i className="fa-solid fa-user mx-1"></i>{t('auth.signup.client')}
                    </button>
                    <button type="button" onClick={() => setRole('provider')}
                        className={`py-3 rounded-xl font-bold text-sm border-2 transition-all ${role === 'provider' ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-600'
                            }`}>
                        <i className="fa-solid fa-store mx-1"></i>{t('auth.signup.provider')}
                    </button>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 card-hover disabled:opacity-50">
                    {loading ? t('common.loading') : t('auth.signup.submit')}
                </button>
            </form>

            <p className="mt-6 text-sm text-gray-500">
                {t('auth.signup.already_have_account')}{' '}
                <Link to="/auth/login" className="text-primary font-bold hover:underline">
                    {t('auth.signup.login_link')}
                </Link>
            </p>
        </div>
    );
};

export default SignupPage;
