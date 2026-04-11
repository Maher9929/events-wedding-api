import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth.service';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: ('client' | 'provider' | 'admin')[];
}

/** Decode the JWT payload and check if `exp` is in the past (without a library). */
function isTokenExpired(token: string): boolean {
    try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        if (!payload.exp) return false;
        return Date.now() / 1000 > payload.exp;
    } catch {
        return true; // If we can't decode it, treat it as expired
    }
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
    const location = useLocation();
    const token = localStorage.getItem('access_token');

    // Proactively clear expired token so the user sees the login page cleanly
    if (token && isTokenExpired(token)) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    const isAuthenticated = authService.isAuthenticated();
    const user = authService.getCurrentUser();

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    if (roles && user && !roles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        const dashboardMap: Record<string, string> = {
            client: '/client/dashboard',
            provider: '/provider/dashboard',
            admin: '/admin/dashboard',
        };
        return <Navigate to={dashboardMap[user.role] || '/'} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
