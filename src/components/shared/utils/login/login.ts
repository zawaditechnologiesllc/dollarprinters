import { isStorageSupported } from '../storage/storage';

const DERIV_APP_ID = 125748;
const DERIV_OAUTH_URL = 'https://oauth.deriv.com/oauth2/authorize';
const REDIRECT_URI = 'https://dollarprinter.pro/callback';
const SIGNUP_URL =
    'https://deriv.partners/rx?sidc=97FBD1C7-EC02-4446-A72B-926E27CF5B6A&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU306765';

export const redirectToLogin = (is_logged_in: boolean, _language?: string, _has_params = true, redirect_delay = 0) => {
    if (!is_logged_in && isStorageSupported(sessionStorage)) {
        setTimeout(() => {
            window.location.href = loginUrl();
        }, redirect_delay);
    }
};

export const redirectToSignUp = () => {
    window.location.href = SIGNUP_URL;
};

export const loginUrl = () => {
    return `${DERIV_OAUTH_URL}?app_id=${DERIV_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
};
