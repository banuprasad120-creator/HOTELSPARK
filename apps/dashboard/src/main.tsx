import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { PropertyProvider } from './context/PropertyContext';
import { ToastProvider } from './components/ui/Toast';
import App from './App';
import './i18n';
import './index.css';

injectSpeedInsights();

const basename = window.location.pathname.startsWith('/admin') ? '/admin' : '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <PropertyProvider>
              <App />
            </PropertyProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
