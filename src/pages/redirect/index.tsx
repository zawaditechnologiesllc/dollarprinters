import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChunkLoader from '@/components/loader/chunk-loader';

const RedirectHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const params: Record<string, string> = {};
        const requiredParams = ['acct1', 'token1', 'cur1'];
        let hasError = false;

        urlParams.forEach((value, key) => {
            params[key] = value;
        });

        // Basic validation
        for (const param of requiredParams) {
            if (!urlParams.get(param)) {
                hasError = true;
                break;
            }
        }

        if (hasError) {
            alert('Missing required parameters for login redirect.');
            navigate('/');
            return;
        }

        // Store tokens and account info in localStorage (similar to CallbackPage)
        const accountsList: Record<string, string> = {};
        const clientAccounts: Record<string, any> = {};

        for (let i = 1; params[`acct${i}`]; i++) {
            const acct = params[`acct${i}`];
            const token = params[`token${i}`];
            const cur = params[`cur${i}`];
            
            if (acct && token) {
                accountsList[acct] = token;
                clientAccounts[acct] = {
                    loginid: acct,
                    token: token,
                    currency: cur || '',
                };
            }
        }

        localStorage.setItem('accountsList', JSON.stringify(accountsList));
        localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
        localStorage.setItem('authToken', params.token1);
        localStorage.setItem('active_loginid', params.acct1);

        // Redirect to dashboard
        window.location.replace(window.location.origin + '/?account=' + (params.cur1 || 'USD').toLowerCase());
    }, [navigate]);

    return <ChunkLoader message='Processing login...' />;
};

export default RedirectHandler;
