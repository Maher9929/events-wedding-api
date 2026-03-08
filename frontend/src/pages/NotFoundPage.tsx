import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';

const NotFoundPage = () => {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();

    const dashboardPath = user?.role === 'provider'
        ? '/vendor/dashboard'
        : user?.role === 'admin'
        ? '/admin/dashboard'
        : user
        ? '/client/dashboard'
        : '/';

    return (
        <div className="min-h-screen bg-bglight font-tajawal flex flex-col items-center justify-center px-5 text-center" dir="rtl">
            <div className="w-32 h-32 rounded-full gradient-purple flex items-center justify-center mb-6 shadow-2xl">
                <span className="text-5xl font-bold text-white">404</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">الصفحة غير موجودة</h1>
            <p className="text-gray-500 text-sm mb-8 max-w-xs">
                عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                    onClick={() => navigate(dashboardPath)}
                    className="w-full py-3.5 rounded-2xl gradient-purple text-white font-bold shadow-lg"
                >
                    <i className="fa-solid fa-house ms-2"></i>
                    العودة للرئيسية
                </button>
                <button
                    onClick={() => navigate(-1)}
                    className="w-full py-3.5 rounded-2xl bg-white text-gray-700 font-bold shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    <i className="fa-solid fa-arrow-right ms-2"></i>
                    الصفحة السابقة
                </button>
            </div>
        </div>
    );
};

export default NotFoundPage;
