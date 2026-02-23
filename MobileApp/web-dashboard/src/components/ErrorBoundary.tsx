import React from 'react';
import * as Sentry from '@sentry/react';
import en from '../i18n/en.json';
import id from '../i18n/id.json';

const translations: Record<string, Record<string, string>> = { en, id };

/** Read the language directly from localStorage (since hooks can't be used in class components). */
function getTranslation(key: string): string {
  const lang = localStorage.getItem('app_language') === 'id' ? 'id' : 'en';
  return translations[lang]?.[key] || translations.en[key] || key;
}

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="p-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              {getTranslation('error.title')}
            </h1>
            <p className="mb-4 text-gray-600">{getTranslation('error.description')}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700"
            >
              {getTranslation('error.tryAgain')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
