import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useStore } from '@/hooks/useStore';

type THeroBanner = {
    handleTabChange: (tab_index: number) => void;
};

const QUICK_LINKS = [
    { label: 'Build a Bot', tab: DBOT_TABS.BOT_BUILDER, icon: '🧩' },
    { label: 'Free Bots', tab: DBOT_TABS.FREE_BOTS, icon: '🤖' },
    { label: 'Analysis Tool', tab: DBOT_TABS.ANALYSIS_TOOL, icon: '📊' },
    { label: 'Signals', tab: DBOT_TABS.SIGNALS, icon: '📡' },
    { label: 'Copy Trading', tab: DBOT_TABS.COPY_TRADING, icon: '👥' },
];

const HeroBanner = observer(({ handleTabChange }: THeroBanner) => {
    const { client } = useStore();
    const is_logged_in = client?.is_logged_in;

    return (
        <div className='hero-banner'>
            <div className='hero-banner__content'>
                <span className='hero-banner__eyebrow'>Dollar Printers</span>
                <h1 className='hero-banner__title'>Automate your Deriv trading like a pro</h1>
                <p className='hero-banner__subtitle'>
                    Build no-code bots, run free pre-made strategies, read live market analysis, and copy expert traders
                    — all in one place.
                </p>
                <div className='hero-banner__actions'>
                    {QUICK_LINKS.map(link => (
                        <button
                            key={link.label}
                            type='button'
                            className='hero-banner__chip'
                            onClick={() => handleTabChange(link.tab as number)}
                        >
                            <span className='hero-banner__chip-icon' aria-hidden>
                                {link.icon}
                            </span>
                            {link.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className='hero-banner__badge'>
                <span className='hero-banner__badge-dot' />
                {is_logged_in ? 'Account connected' : 'Live market data'}
            </div>
        </div>
    );
});

export default HeroBanner;
