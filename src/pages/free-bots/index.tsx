import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { load, save_types } from '@/external/bot-skeleton';
import './free-bots.scss';

interface Bot {
    id: string;
    name: string;
    description: string;
    fileName: string;
    category: string;
    icon: string;
    visible: boolean;
}

function track(page?: string, botId?: string) {
    fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, botId }),
    }).catch(() => {});
}

const FreeBots = observer(() => {
    const { dashboard } = useStore();
    const [bots, setBots] = useState<Bot[]>([]);
    const [loadingBotId, setLoadingBotId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    useEffect(() => {
        fetch('/bots/manifest.json')
            .then(r => r.json())
            .then((data: Bot[]) => setBots(data.filter(b => b.visible)))
            .catch(() => {});
        track('free-bots');
    }, []);

    const categories = ['All', ...Array.from(new Set(bots.map(bot => bot.category)))];

    const filteredBots = selectedCategory === 'All'
        ? bots
        : bots.filter(bot => bot.category === selectedCategory);

    const loadBot = async (bot: Bot) => {
        try {
            setLoadingBotId(bot.id);
            track(undefined, bot.id);

            const response = await fetch(`/bots/${bot.fileName}`);
            if (!response.ok) throw new Error('Failed to fetch bot file');
            const xmlContent = await response.text();

            if (!(window as any).Blockly?.derivWorkspace) {
                dashboard.setActiveTab(1);
                window.location.hash = 'bot_builder';
                const deadline = Date.now() + 15000;
                while (!(window as any).Blockly?.derivWorkspace && Date.now() < deadline) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            const workspace = (window as any).Blockly?.derivWorkspace;
            if (!workspace) throw new Error('Bot Builder workspace not found. Please try again.');

            await load({
                block_string: xmlContent,
                file_name: bot.name,
                workspace,
                from: save_types.LOCAL,
                drop_event: null,
                strategy_id: null,
                showIncompatibleStrategyDialog: null,
            });

            dashboard.setActiveTab(1);
            window.location.hash = 'bot_builder';
        } catch (error: any) {
            console.error('Error loading bot:', error);
            if (error?.message?.includes('unsupported elements')) {
                alert('This bot contains elements not supported in the current version.');
            } else {
                alert(`Failed to load bot: ${error?.message || 'Unknown error'}`);
            }
        } finally {
            setLoadingBotId(null);
        }
    };

    return (
        <div className='free-bots'>
            <div className='free-bots__header'>
                <h1 className='free-bots__title'>Free Trading Bots</h1>
                <p className='free-bots__subtitle'>
                    Explore our collection of pre-built trading bots. Click on any bot to load it into the Bot Builder.
                </p>
            </div>

            <div className='free-bots__categories'>
                {categories.map(category => (
                    <button
                        key={category}
                        className={`free-bots__category-btn ${selectedCategory === category ? 'free-bots__category-btn--active' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className='free-bots__grid'>
                {filteredBots.map(bot => (
                    <div key={bot.id} className='free-bots__card'>
                        <div className='free-bots__card-header'>
                            <span className='free-bots__card-icon'>{bot.icon}</span>
                            <span className='free-bots__card-category'>{bot.category}</span>
                        </div>
                        <h3 className='free-bots__card-title'>{bot.name}</h3>
                        <p className='free-bots__card-description'>{bot.description}</p>
                        <button
                            className='free-bots__card-btn'
                            onClick={() => loadBot(bot)}
                            disabled={loadingBotId === bot.id}
                        >
                            {loadingBotId === bot.id ? (
                                <span className='free-bots__card-btn-loading'>Loading...</span>
                            ) : (
                                <>
                                    <span>Load Bot</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <div className='free-bots__footer'>
                <p>All bots are provided for educational purposes. Always test with demo accounts first.</p>
            </div>
        </div>
    );
});

export default FreeBots;
