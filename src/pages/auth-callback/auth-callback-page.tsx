import React, { useEffect, useState } from 'react';

type TAuthCallbackStatus = 'processing' | 'success' | 'error';

const AuthCallbackPage = () => {
    const [status, setStatus] = useState<TAuthCallbackStatus>('processing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const processCallback = () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);

                console.log('[DollarPrinters] /auth/callback reached');
                console.log('[DollarPrinters] Full URL:', window.location.href);
                console.log('[DollarPrinters] Full query string:', window.location.search);

                // Deriv OAuth sends tokens directly as query params: acct1, token1, cur1, etc.
                const acct1 = urlParams.get('acct1');
                const token1 = urlParams.get('token1');

                console.log('[DollarPrinters] acct1:', acct1);
                console.log('[DollarPrinters] token1:', token1 ? token1.slice(0, 8) + '…[redacted]' : null);

                if (!acct1 || !token1) {
                    console.error('[DollarPrinters] Missing acct1 or token1 — aborting login');
                    setErrorMessage('Missing authentication parameters. Please try logging in again.');
                    setStatus('error');
                    return;
                }

                // Parse all acct/token/cur sets (Deriv can return multiple accounts)
                const accountsList: Record<string, string> = {};
                const clientAccounts: Record<string, { loginid: string; token: string; currency: string }> = {};

                for (let i = 1; ; i++) {
                    const acct = urlParams.get(`acct${i}`);
                    const token = urlParams.get(`token${i}`);
                    const cur = urlParams.get(`cur${i}`) || '';

                    if (!acct || !token) break;

                    accountsList[acct] = token;
                    clientAccounts[acct] = {
                        loginid: acct,
                        token,
                        currency: cur,
                    };
                    console.log(`[DollarPrinters] Account ${i}: loginid=${acct}, currency=${cur}`);
                }

                console.log('[DollarPrinters] Total accounts parsed:', Object.keys(accountsList).length);

                // Store auth data in localStorage
                localStorage.setItem('accountsList', JSON.stringify(accountsList));
                localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
                localStorage.setItem('authToken', token1);
                localStorage.setItem('active_loginid', acct1);

                console.log('[DollarPrinters] Auth data stored in localStorage — active loginid:', acct1);

                // Set logged_state cookie so silent login detection works
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30);
                document.cookie = `logged_state=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;

                setStatus('success');

                // Determine the first real account's currency for the redirect.
                // Keep original casing from Deriv (uppercase, e.g. 'GBP') so the
                // Layout's clientHasCurrency comparison matches and no OIDC loop fires.
                const firstAccountData = clientAccounts[acct1];
                const currency = firstAccountData?.currency || 'USD';
                const accountParam = acct1.startsWith('VR') ? 'demo' : currency;
                const redirectTarget = `${window.location.origin}/?account=${accountParam}`;

                console.log('[DollarPrinters] Redirecting to dashboard:', redirectTarget);

                // Redirect to the main dashboard
                window.location.replace(redirectTarget);
            } catch (err) {
                console.error('[DollarPrinters] Callback error:', err);
                setErrorMessage('An unexpected error occurred during login. Please try again.');
                setStatus('error');
            }
        };

        processCallback();
    }, []);

    if (status === 'processing' || status === 'success') {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    fontFamily: 'sans-serif',
                    color: '#333',
                }}
            >
                <div
                    style={{
                        width: 48,
                        height: 48,
                        border: '4px solid #eee',
                        borderTop: '4px solid #ff444f',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        marginBottom: 16,
                    }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ fontSize: 16 }}>Logging you in...</p>
            </div>
        );
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                fontFamily: 'sans-serif',
                color: '#333',
                gap: 16,
            }}
        >
            <p style={{ fontSize: 16, color: '#cc0000' }}>{errorMessage}</p>
            <button
                style={{
                    padding: '10px 24px',
                    backgroundColor: '#ff444f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14,
                }}
                onClick={() => {
                    window.location.href = '/';
                }}
            >
                Return to home
            </button>
        </div>
    );
};

export default AuthCallbackPage;
