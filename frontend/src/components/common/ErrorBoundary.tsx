import i18n from '../../i18n';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center bg-gray-50/50 rounded-3xl p-8 text-center font-tajawal" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
          <div>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{i18n.t('errors.unexpected')}</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              {i18n.t('errors.unexpected_desc')}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity"
            >
              <i className="fa-solid fa-rotate-right ms-2"></i>
              {i18n.t('errors.refresh_page')}
            </button>
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 p-4 bg-red-50 rounded-xl text-left rtl:text-right overflow-auto max-w-2xl max-h-60">
                <p className="text-red-800 font-mono text-xs">{this.state.error.toString()}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
