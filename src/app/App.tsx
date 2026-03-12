import { initSurvicate } from '../public-path';
import { lazy, Suspense } from 'react';
import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import ChunkLoader from '@/components/loader/chunk-loader';
import RoutePromptDialog from '@/components/route-prompt-dialog';
import { crypto_currencies_display_order, fiat_currencies_display_order } from '@/components/shared';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { StoreProvider } from '@/hooks/useStore';
import AuthCallbackPage from '@/pages/auth-callback';
import CallbackPage from '@/pages/callback';
import Endpoint from '@/pages/endpoint';
import RedirectHandler from '@/pages/redirect';
import SignupRedirectHandler from '@/pages/signup-redirect';
import { TAuthData } from '@/types/api-types';
import { initializeI18n, localize, TranslationProvider } from '@deriv-com/translations';
import CoreStoreProvider from './CoreStoreProvider';
import './app-root.scss';

// Intercept Deriv OAuth callback that lands at the root URL.
// Deriv can redirect to https://dollarprinter.pro/?acct1=...&token1=...
// This runs synchronously at module load — before React mounts — so the Layout
// can never fire requestOidcAuthentication and hijack the browser away.
// IMPORTANT: skip when already at /auth/callback to prevent a redirect loop.
(function interceptOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const isAlreadyAtCallback = window.location.pathname === '/auth/callback';
    if (!isAlreadyAtCallback && params.has('acct1') && params.has('token1')) {
        window.location.replace(`/auth/callback${window.location.search}`);
    }
})();

const Layout = lazy(() => import('../components/layout'));
const AppRoot = lazy(() => import('./app-root'));
const FreeBots = lazy(() => import('../pages/free-bots'));
const AnalysisTool = lazy(() => import('../pages/analysis-tool'));

const { TRANSLATIONS_CDN_URL, R2_PROJECT_NAME, CROWDIN_BRANCH_NAME } = process.env;
const i18nInstance = initializeI18n({
    cdnUrl: `${TRANSLATIONS_CDN_URL}/${R2_PROJECT_NAME}/${CROWDIN_BRANCH_NAME}`,
});

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => {
    const { isOnline } = useOfflineDetection();

    const getLoadingMessage = () => {
        if (!isOnline) return localize('Loading offline dashboard...');
        return localize('Please wait while we connect to the server...');
    };

    return <Suspense fallback={<ChunkLoader message={getLoadingMessage()} />}>{children}</Suspense>;
};

const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {/*
             * /auth/callback is intentionally a STANDALONE top-level route.
             * It must NOT be nested inside the Layout or any store/provider that
             * could call requestOidcAuthentication() and redirect away before the
             * token params are read from the URL.
             */}
            <Route path='/auth/callback' element={<AuthCallbackPage />} />

            {/* All other routes go through the full Layout + providers */}
            <Route
                path='/'
                element={
                    <SuspenseWrapper>
                        <TranslationProvider defaultLang='EN' i18nInstance={i18nInstance}>
                            <StoreProvider>
                                <RoutePromptDialog />
                                <CoreStoreProvider>
                                    <Layout />
                                </CoreStoreProvider>
                            </StoreProvider>
                        </TranslationProvider>
                    </SuspenseWrapper>
                }
            >
                <Route index element={<AppRoot />} />
                <Route path='endpoint' element={<Endpoint />} />
                <Route path='callback' element={<CallbackPage />} />
                <Route path='redirect' element={<RedirectHandler />} />
                <Route path='signup-redirect' element={<SignupRedirectHandler />} />
                <Route path='free-bots' element={<FreeBots />} />
                <Route path='analysis-tool' element={<AnalysisTool />} />
            </Route>
        </>
    )
);

function App() {
    React.useEffect(() => {
        initSurvicate();
        window?.dataLayer?.push({ event: 'page_load' });
        return () => {
            const survicate_box = document.getElementById('survicate-box');
            if (survicate_box) {
                survicate_box.style.display = 'none';
            }
        };
    }, []);

    React.useEffect(() => {
        const accounts_list = localStorage.getItem('accountsList');
        const client_accounts = localStorage.getItem('clientAccounts');
        const url_params = new URLSearchParams(window.location.search);
        const account_currency = url_params.get('account');
        const validCurrencies = [...fiat_currencies_display_order, ...crypto_currencies_display_order];

        const is_valid_currency = account_currency && validCurrencies.includes(account_currency?.toUpperCase());

        if (!accounts_list || !client_accounts) return;

        try {
            const parsed_accounts = JSON.parse(accounts_list);
            const parsed_client_accounts = JSON.parse(client_accounts) as TAuthData['account_list'];

            const updateLocalStorage = (token: string, loginid: string) => {
                localStorage.setItem('authToken', token);
                localStorage.setItem('active_loginid', loginid);
            };

            if (account_currency?.toUpperCase() === 'DEMO') {
                const demo_account = Object.entries(parsed_accounts).find(([key]) => key.startsWith('VR'));

                if (demo_account) {
                    const [loginid, token] = demo_account;
                    updateLocalStorage(String(token), loginid);
                    return;
                }
            }

            if (account_currency?.toUpperCase() !== 'DEMO' && is_valid_currency) {
                const real_account = Object.entries(parsed_client_accounts).find(
                    ([loginid, account]) =>
                        !loginid.startsWith('VR') && account.currency.toUpperCase() === account_currency?.toUpperCase()
                );

                if (real_account) {
                    const [loginid, account] = real_account;
                    if ('token' in account) {
                        updateLocalStorage(String(account?.token), loginid);
                    }
                    return;
                }
            }
        } catch (e) {
            console.warn('Error', e); // eslint-disable-line no-console
        }
    }, []);

    return <RouterProvider router={router} />;
}

export default App;
