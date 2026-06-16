import React, { useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { generateOAuthURL } from '@/components/shared';
import { api_base } from '@/external/bot-skeleton';
import { useApiBase } from '@/hooks/useApiBase';
import './copy-trading.scss';

type TTrader = {
    token: string;
    loginid?: string;
    addedAt: number;
};

type TStatistics = {
    active_since?: number;
    avg_duration?: number;
    avg_loss?: number;
    avg_profit?: number;
    copiers?: number;
    monthly_profitable_trades?: Record<string, number>;
    performance_probability?: number;
    total_trades?: number;
    trades_breakdown?: Record<string, number>;
    trades_profitable?: number;
    yearly_profitable_trades?: Record<string, number>;
};

const STORAGE_KEY = 'dp_copy_traders';

const loadTraders = (): TTrader[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as TTrader[]) : [];
    } catch {
        return [];
    }
};

const saveTraders = (traders: TTrader[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(traders));
    } catch {
        /* no-op */
    }
};

const CopyTrading = observer(() => {
    const { isAuthorized } = useApiBase();
    const [token, setToken] = useState('');
    const [traderId, setTraderId] = useState('');
    const [traders, setTraders] = useState<TTrader[]>(loadTraders);
    const [statistics, setStatistics] = useState<TStatistics | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        saveTraders(traders);
    }, [traders]);

    const send = useCallback(async (request: Record<string, unknown>) => {
        if (!api_base?.api) throw new Error('Trading connection is not ready. Please wait a moment and try again.');
        return api_base.api.send(request);
    }, []);

    const fetchStatistics = useCallback(async () => {
        if (!traderId.trim()) {
            setMessage({ type: 'error', text: 'Enter a trader account ID (loginid) to view their statistics.' });
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            const response = (await send({ copytrading_statistics: 1, trader_id: traderId.trim() })) as {
                copytrading_statistics?: TStatistics;
                error?: { message: string };
            };
            if (response.error) {
                setMessage({ type: 'error', text: response.error.message });
                setStatistics(null);
            } else {
                setStatistics(response.copytrading_statistics ?? null);
                setMessage({ type: 'success', text: 'Trader statistics loaded.' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to load statistics.' });
        } finally {
            setBusy(false);
        }
    }, [traderId, send]);

    const startCopying = useCallback(async () => {
        if (!token.trim()) {
            setMessage({ type: 'error', text: "Paste the trader's read token to start copying." });
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            const response = (await send({ copy_start: token.trim() })) as {
                copy_start?: number;
                error?: { message: string };
            };
            if (response.error) {
                setMessage({ type: 'error', text: response.error.message });
            } else if (response.copy_start === 1) {
                setMessage({
                    type: 'success',
                    text: 'You are now copying this trader. New trades will be mirrored automatically.',
                });
                setTraders(prev =>
                    prev.some(t => t.token === token.trim())
                        ? prev
                        : [...prev, { token: token.trim(), loginid: traderId.trim() || undefined, addedAt: Date.now() }]
                );
                setToken('');
            }
        } catch (e) {
            setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to start copying.' });
        } finally {
            setBusy(false);
        }
    }, [token, traderId, send]);

    const stopCopying = useCallback(
        async (stopToken: string) => {
            setBusy(true);
            setMessage(null);
            try {
                const response = (await send({ copy_stop: stopToken })) as {
                    copy_stop?: number;
                    error?: { message: string };
                };
                if (response.error) {
                    setMessage({ type: 'error', text: response.error.message });
                } else {
                    setMessage({ type: 'info', text: 'Stopped copying this trader.' });
                    setTraders(prev => prev.filter(t => t.token !== stopToken));
                }
            } catch (e) {
                setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to stop copying.' });
            } finally {
                setBusy(false);
            }
        },
        [send]
    );

    if (!isAuthorized) {
        return (
            <div className='copy-trading'>
                <div className='copy-trading__login'>
                    <h2>Copy Trading</h2>
                    <p>Log in to your Deriv account to copy expert traders automatically.</p>
                    <button
                        className='copy-trading__btn copy-trading__btn--primary'
                        onClick={() => window.location.assign(generateOAuthURL())}
                    >
                        Log in to continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className='copy-trading'>
            <header className='copy-trading__header'>
                <h2 className='copy-trading__title'>Copy Trading</h2>
                <p className='copy-trading__subtitle'>
                    Mirror the trades of expert traders in real time. Paste a trader&apos;s read token to begin, or
                    review their performance first.
                </p>
            </header>

            {message && (
                <div className={`copy-trading__alert copy-trading__alert--${message.type}`}>{message.text}</div>
            )}

            <div className='copy-trading__panels'>
                <section className='copy-card'>
                    <h3>1. Review a trader</h3>
                    <p className='copy-card__hint'>
                        Enter a trader&apos;s account ID (e.g. CR1234567) to see their verified statistics.
                    </p>
                    <div className='copy-card__row'>
                        <input
                            type='text'
                            placeholder='Trader account ID (loginid)'
                            value={traderId}
                            onChange={e => setTraderId(e.target.value)}
                        />
                        <button className='copy-trading__btn' disabled={busy} onClick={fetchStatistics}>
                            View stats
                        </button>
                    </div>

                    {statistics && (
                        <ul className='copy-stats'>
                            <li>
                                <span>Total trades</span>
                                <strong>{statistics.total_trades ?? '—'}</strong>
                            </li>
                            <li>
                                <span>Profitable trades</span>
                                <strong>
                                    {statistics.trades_profitable != null
                                        ? `${(statistics.trades_profitable * 100).toFixed(1)}%`
                                        : '—'}
                                </strong>
                            </li>
                            <li>
                                <span>Avg. profit</span>
                                <strong>
                                    {statistics.avg_profit != null
                                        ? `${(statistics.avg_profit * 100).toFixed(2)}%`
                                        : '—'}
                                </strong>
                            </li>
                            <li>
                                <span>Avg. loss</span>
                                <strong>
                                    {statistics.avg_loss != null ? `${(statistics.avg_loss * 100).toFixed(2)}%` : '—'}
                                </strong>
                            </li>
                            <li>
                                <span>Copiers</span>
                                <strong>{statistics.copiers ?? '—'}</strong>
                            </li>
                            <li>
                                <span>Performance score</span>
                                <strong>
                                    {statistics.performance_probability != null
                                        ? `${(statistics.performance_probability * 100).toFixed(1)}%`
                                        : '—'}
                                </strong>
                            </li>
                        </ul>
                    )}
                </section>

                <section className='copy-card'>
                    <h3>2. Start copying</h3>
                    <p className='copy-card__hint'>
                        Paste the trader&apos;s <strong>read token</strong>. Their future trades will be copied to your
                        account using your own stake settings.
                    </p>
                    <div className='copy-card__row'>
                        <input
                            type='text'
                            placeholder="Trader's read token"
                            value={token}
                            onChange={e => setToken(e.target.value)}
                        />
                        <button
                            className='copy-trading__btn copy-trading__btn--primary'
                            disabled={busy}
                            onClick={startCopying}
                        >
                            Start copying
                        </button>
                    </div>
                    <p className='copy-card__warning'>
                        Copy trading places real trades automatically and carries risk. Only copy traders you trust and
                        never invest more than you can afford to lose.
                    </p>
                </section>
            </div>

            <section className='copy-card'>
                <h3>Traders you are copying</h3>
                {traders.length === 0 ? (
                    <p className='copy-card__hint'>You are not copying anyone yet.</p>
                ) : (
                    <ul className='copy-list'>
                        {traders.map(t => (
                            <li key={t.token} className='copy-list__item'>
                                <div className='copy-list__info'>
                                    <span className='copy-list__id'>{t.loginid || 'Trader'}</span>
                                    <span className='copy-list__token'>••••{t.token.slice(-6)}</span>
                                </div>
                                <button
                                    className='copy-trading__btn copy-trading__btn--danger'
                                    disabled={busy}
                                    onClick={() => stopCopying(t.token)}
                                >
                                    Stop
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
});

export default CopyTrading;
