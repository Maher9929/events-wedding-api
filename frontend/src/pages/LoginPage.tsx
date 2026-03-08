import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { toastService } from '../services/toast.service';

const LoginPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login, isAuthenticated, user } = useAuth();

    useEffect(() => {
        document.title = `${t('auth.login.title')} | DOUSHA`;
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

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            const res = await login(email, password);
            toastService.success(t('auth.login.success'));
            const role = res?.user?.role;
            if (role === 'provider') navigate('/provider/dashboard');
            else if (role === 'admin') navigate('/admin/dashboard');
            else navigate('/client/dashboard');
        } catch (err: any) {
            const errorMsg = err.message || t('auth.login.error');
            setError(errorMsg);
            toastService.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.login.title')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('auth.login.subtitle')}</p>

            {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-xl">{error}</p>}

            <form onSubmit={handleLogin} className="space-y-4">
                <input
                    type="email"
                    name="email"
                    placeholder={t('auth.login.email')}
                    className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder={t('auth.login.password')}
                    className="w-full px-4 py-3 rounded-xl bg-bglight border-none outline-none focus:ring-2 focus:ring-primary/20"
                    required
                />
                <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 card-hover disabled:opacity-50">
                    {loading ? t('common.loading') : t('auth.login.submit')}
                </button>
            </form>

            <p className="mt-6 text-sm text-gray-500">
                {t('auth.login.no_account')}{' '}
                <Link to="/auth/signup" className="text-primary font-bold hover:underline">
                    {t('auth.login.signup_link')}
                </Link>
            </p>
        </div>
    );
};

export default LoginPage;
