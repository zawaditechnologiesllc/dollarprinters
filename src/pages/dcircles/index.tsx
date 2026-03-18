import React from 'react';
import { observer } from 'mobx-react-lite';
import './dcircles.scss';

const Dcircles = observer(() => {
    const handleOpen = () => {
        window.open('https://app.deriv.com/dcircles', '_blank', 'noopener,noreferrer');
    };

    return (
        <div className='dcircles'>
            <div className='dcircles__hero'>
                <div className='dcircles__hero-content'>
                    <div className='dcircles__logo'>
                        <svg width='64' height='64' viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'>
                            <circle cx='32' cy='32' r='30' stroke='var(--brand-red-coral)' strokeWidth='3' fill='none' />
                            <circle cx='20' cy='28' r='8' fill='var(--brand-red-coral)' opacity='0.85' />
                            <circle cx='44' cy='28' r='8' fill='var(--brand-red-coral)' opacity='0.65' />
                            <circle cx='32' cy='42' r='8' fill='var(--brand-red-coral)' opacity='0.75' />
                            <line x1='27' y1='32' x2='37' y2='32' stroke='white' strokeWidth='1.5' />
                            <line x1='23' y1='34' x2='29' y2='40' stroke='white' strokeWidth='1.5' />
                            <line x1='41' y1='34' x2='35' y2='40' stroke='white' strokeWidth='1.5' />
                        </svg>
                    </div>
                    <h1 className='dcircles__title'>Deriv D-Circles</h1>
                    <p className='dcircles__subtitle'>
                        Join a social trading community. Follow top traders, copy their strategies, and grow your
                        portfolio together.
                    </p>
                    <button className='dcircles__cta-btn' onClick={handleOpen}>
                        Open D-Circles
                        <svg
                            width='18'
                            height='18'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                        >
                            <path d='M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6' />
                            <polyline points='15,3 21,3 21,9' />
                            <line x1='10' y1='14' x2='21' y2='3' />
                        </svg>
                    </button>
                </div>
            </div>

            <div className='dcircles__features'>
                <div className='dcircles__feature-card'>
                    <div className='dcircles__feature-icon'>
                        <svg
                            width='32'
                            height='32'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='var(--brand-red-coral)'
                            strokeWidth='1.8'
                        >
                            <path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' />
                            <circle cx='9' cy='7' r='4' />
                            <path d='M23 21v-2a4 4 0 00-3-3.87' />
                            <path d='M16 3.13a4 4 0 010 7.75' />
                        </svg>
                    </div>
                    <h3 className='dcircles__feature-title'>Follow Top Traders</h3>
                    <p className='dcircles__feature-desc'>
                        Discover and follow expert traders in the Deriv ecosystem. See their live performance and
                        trading history.
                    </p>
                </div>

                <div className='dcircles__feature-card'>
                    <div className='dcircles__feature-icon'>
                        <svg
                            width='32'
                            height='32'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='var(--brand-red-coral)'
                            strokeWidth='1.8'
                        >
                            <polyline points='16 16 12 12 8 16' />
                            <line x1='12' y1='12' x2='12' y2='21' />
                            <path d='M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3' />
                        </svg>
                    </div>
                    <h3 className='dcircles__feature-title'>Copy Signals</h3>
                    <p className='dcircles__feature-desc'>
                        Automatically copy trading signals from successful traders and let your account mirror their
                        strategies.
                    </p>
                </div>

                <div className='dcircles__feature-card'>
                    <div className='dcircles__feature-icon'>
                        <svg
                            width='32'
                            height='32'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='var(--brand-red-coral)'
                            strokeWidth='1.8'
                        >
                            <line x1='18' y1='20' x2='18' y2='10' />
                            <line x1='12' y1='20' x2='12' y2='4' />
                            <line x1='6' y1='20' x2='6' y2='14' />
                        </svg>
                    </div>
                    <h3 className='dcircles__feature-title'>Track Performance</h3>
                    <p className='dcircles__feature-desc'>
                        View detailed performance metrics, win rates, and drawdown stats before choosing who to
                        follow.
                    </p>
                </div>

                <div className='dcircles__feature-card'>
                    <div className='dcircles__feature-icon'>
                        <svg
                            width='32'
                            height='32'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='var(--brand-red-coral)'
                            strokeWidth='1.8'
                        >
                            <circle cx='12' cy='12' r='10' />
                            <path d='M12 8v4l3 3' />
                        </svg>
                    </div>
                    <h3 className='dcircles__feature-title'>Real-Time Signals</h3>
                    <p className='dcircles__feature-desc'>
                        Get instant notifications on new trading signals and market opportunities from the traders
                        you follow.
                    </p>
                </div>
            </div>

            <div className='dcircles__footer'>
                <p>
                    D-Circles is powered by Deriv.{' '}
                    <button className='dcircles__footer-link' onClick={handleOpen}>
                        Open the full platform →
                    </button>
                </p>
            </div>
        </div>
    );
});

export default Dcircles;
