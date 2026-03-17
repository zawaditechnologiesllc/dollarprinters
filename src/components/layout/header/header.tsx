import { useCallback } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import PWAInstallButton from '@/components/pwa-install-button';
import { generateOAuthURL, redirectToSignUp, standalone_routes } from '@/components/shared';
import { loginUrl } from '@/components/shared/utils/login/login';
import Button from '@/components/shared_ui/button';
import useActiveAccount from '@/hooks/api/account/useActiveAccount';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import { useFirebaseCountriesConfig } from '@/hooks/firebase/useFirebaseCountriesConfig';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import useTMB from '@/hooks/useTMB';
import { clearAuthData, handleOidcAuthFailure } from '@/utils/auth-utils';
import { StandaloneGearRegularIcon } from '@deriv/quill-icons/Standalone';
import { requestOidcAuthentication } from '@deriv-com/auth-client';
import { Localize, useTranslations } from '@deriv-com/translations';
import { Header, useDevice, Wrapper } from '@deriv-com/ui';
import { Tooltip } from '@deriv-com/ui';
import { AppLogo } from '../app-logo';
import AccountsInfoLoader from './account-info-loader';
import AccountSwitcher from './account-switcher';
import ManageFundsMenu from './manage-funds-menu/manage-funds-menu';
import MenuItems from './menu-items';
import MobileMenu from './mobile-menu';
import PlatformSwitcher from './platform-switcher';
import './header.scss';

type TAppHeaderProps = {
    isAuthenticating?: boolean;
};

const AppHeader = observer(({ isAuthenticating }: TAppHeaderProps) => {
    const { isDesktop } = useDevice();
    const { isAuthorizing, activeLoginid } = useApiBase();
    const { client } = useStore() ?? {};

    const { data: activeAccount } = useActiveAccount({ allBalanceData: client?.all_accounts_balance });
    const { accounts, getCurrency, is_virtual } = client ?? {};
    const has_wallet = Object.keys(accounts ?? {}).some(id => accounts?.[id].account_category === 'wallet');

    const currency = getCurrency?.();
    const { localize } = useTranslations();
    const { isSingleLoggingIn } = useOauth2();

    const { hubEnabledCountryList } = useFirebaseCountriesConfig();
    const { onRenderTMBCheck, isTmbEnabled } = useTMB();
    const is_tmb_enabled = isTmbEnabled() || window.is_tmb_enabled === true;

    const getAccountSettingsUrl = () => {
        const is_hub_enabled_country = hubEnabledCountryList.includes(client?.residence || '');
        let redirect_url = new URL(
            has_wallet && is_hub_enabled_country ? standalone_routes.account_settings : standalone_routes.personal_details
        );
        const urlParams = new URLSearchParams(window.location.search);
        const account_param = urlParams.get('account');
        const is_demo = client?.is_virtual || account_param === 'demo';
        if (is_demo) {
            redirect_url.searchParams.set('account', 'demo');
        } else if (currency) {
            redirect_url.searchParams.set('account', currency);
        }
        return redirect_url.toString();
    };

    const renderAccountSection = useCallback(() => {
        if (isAuthenticating || isAuthorizing || (isSingleLoggingIn && !is_tmb_enabled)) {
            return <AccountsInfoLoader isLoggedIn isMobile={!isDesktop} speed={3} />;
        } else if (activeLoginid) {
            return (
                <>
                    <ManageFundsMenu currency={currency} is_virtual={is_virtual} />

                    <AccountSwitcher activeAccount={activeAccount} />

                    <Tooltip
                        as='a'
                        href={getAccountSettingsUrl()}
                        tooltipContent={localize('Account settings')}
                        tooltipPosition='bottom'
                        className='app-header__account-settings'
                    >
                        <StandaloneGearRegularIcon className='app-header__profile_icon' iconSize='sm' />
                    </Tooltip>
                </>
            );
        } else {
            return (
                <div className='auth-actions'>
                    <span className='signup-message'>
                        <Localize i18n_default_text='New to Deriv? Get your free account to unlock premium bots.' />
                    </span>
                    <Button
                        tertiary
                        onClick={() => {
                            window.location.href = loginUrl();
                        }}
                    >
                        <Localize i18n_default_text='Log in' />
                    </Button>
                    <Button
                        primary
                        onClick={() => {
                            redirectToSignUp();
                        }}
                    >
                        <Localize i18n_default_text='Sign up' />
                    </Button>
                </div>
            );
        }
    }, [
        isAuthenticating,
        isAuthorizing,
        isSingleLoggingIn,
        isDesktop,
        activeLoginid,
        client,
        has_wallet,
        currency,
        localize,
        activeAccount,
        is_virtual,
        onRenderTMBCheck,
        is_tmb_enabled,
    ]);

    if (client?.should_hide_header) return null;
    return (
        <Header
            className={clsx('app-header', {
                'app-header--desktop': isDesktop,
                'app-header--mobile': !isDesktop,
            })}
        >
            <Wrapper variant='left'>
                <AppLogo />
                <MobileMenu />
                {isDesktop && <MenuItems />}
            </Wrapper>
            <Wrapper variant='right'>
                {!isDesktop && <PWAInstallButton variant='primary' size='medium' />}
                {renderAccountSection()}
            </Wrapper>
        </Header>
    );
});

export default AppHeader;
