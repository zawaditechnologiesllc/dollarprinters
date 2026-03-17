import React, { useEffect, useRef, useState } from 'react';
import { standalone_routes } from '@/components/shared';
import {
    StandaloneArrowDownToBracketRegularIcon,
    StandaloneArrowRightArrowLeftRegularIcon,
    StandaloneArrowUpFromBracketRegularIcon,
    StandaloneWalletRegularIcon,
} from '@deriv/quill-icons/Standalone';
import { Localize, useTranslations } from '@deriv-com/translations';
import './manage-funds-menu.scss';

type TManageFundsMenu = {
    currency?: string;
    is_virtual?: boolean;
};

const ManageFundsMenu = ({ currency, is_virtual }: TManageFundsMenu) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const { localize } = useTranslations();

    const addAccountParam = (href: string) => {
        try {
            const url = new URL(href);
            if (is_virtual) {
                url.searchParams.set('account', 'demo');
            } else if (currency) {
                url.searchParams.set('account', currency);
            }
            return url.toString();
        } catch {
            return href;
        }
    };

    const items = [
        {
            label: localize('Deposit'),
            href: addAccountParam(standalone_routes.cashier_deposit),
            Icon: StandaloneArrowDownToBracketRegularIcon,
        },
        {
            label: localize('Withdrawal'),
            href: addAccountParam(standalone_routes.cashier_withdrawal),
            Icon: StandaloneArrowUpFromBracketRegularIcon,
        },
        {
            label: localize('Transfer'),
            href: addAccountParam(standalone_routes.cashier_transfer),
            Icon: StandaloneArrowRightArrowLeftRegularIcon,
        },
    ];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className='manage-funds-menu' ref={ref}>
            <button
                className='manage-funds-menu__trigger'
                onClick={() => setIsOpen(prev => !prev)}
                aria-expanded={isOpen}
                aria-haspopup='true'
            >
                <StandaloneWalletRegularIcon iconSize='sm' />
                <span className='manage-funds-menu__trigger-label'>
                    <Localize i18n_default_text='Manage Funds' />
                </span>
            </button>

            {isOpen && (
                <div className='manage-funds-menu__dropdown' role='menu'>
                    {items.map(({ label, href, Icon }) => (
                        <a
                            key={label}
                            href={href}
                            className='manage-funds-menu__item'
                            role='menuitem'
                            onClick={() => setIsOpen(false)}
                        >
                            <Icon iconSize='sm' className='manage-funds-menu__item-icon' />
                            <span>{label}</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageFundsMenu;
