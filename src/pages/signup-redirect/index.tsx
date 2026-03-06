import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChunkLoader from '@/components/loader/chunk-loader';

const SignupRedirectHandler = () => {
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
            alert('Missing required parameters for signup redirect.');
            navigate('/');
            return;
        }

        // Logic for "creating a new account" usually involves initializing session with provided tokens
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

        // For signup, we might want to flag that it's a new user or go to onboarding
        // Here we redirect to the main app which handles onboarding/dashboard
        window.location.replace(window.location.origin + '/?account=' + (params.cur1 || 'USD').toLowerCase() + '&signup=true');
    }, [navigate]);

    return <ChunkLoader message='Setting up your account...' />;
};

export default SignupRedirectHandler;
