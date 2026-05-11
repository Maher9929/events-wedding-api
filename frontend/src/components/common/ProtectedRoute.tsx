import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/auth.service';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: ('client' | 'provider' | 'admin')[];
}


const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
    const location = useLocation();

    // Token is in HttpOnly cookie (JS cannot read it) — rely on user profile presence
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
