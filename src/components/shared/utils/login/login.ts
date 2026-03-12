import { isStorageSupported } from '../storage/storage';

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
    const redirect_uri = encodeURIComponent('https://dollarprinter.pro/');
    return `https://oauth.deriv.com/oauth2/authorize?app_id=125748&l=EN&brand=DOLLARPRINTERPRO&redirect_uri=${redirect_uri}`;
};
