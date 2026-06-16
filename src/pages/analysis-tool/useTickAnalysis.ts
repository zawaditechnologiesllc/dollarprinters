import { useEffect, useMemo, useRef, useState } from 'react';
import { getAppId, getSocketURL } from '@/components/shared';
import { website_name } from '@/utils/site-config';

/** Synthetic indices that support last-digit / over-under / even-odd trades. */
export const ANALYSIS_SYMBOLS: { symbol: string; name: string }[] = [
    { symbol: 'R_10', name: 'Volatility 10 Index' },
    { symbol: 'R_25', name: 'Volatility 25 Index' },
    { symbol: 'R_50', name: 'Volatility 50 Index' },
    { symbol: 'R_75', name: 'Volatility 75 Index' },
    { symbol: 'R_100', name: 'Volatility 100 Index' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index' },
];

export const TICK_COUNT_OPTIONS = [25, 50, 100, 250, 500, 1000];

export type TConnectionStatus = 'connecting' | 'open' | 'error' | 'closed';

export type TDigitStat = {
    digit: number;
    count: number;
    percentage: number;
    isHighest: boolean;
    isLowest: boolean;
};

export type TTickAnalysis = {
    status: TConnectionStatus;
    prices: number[];
    digits: number[];
    decimals: number;
    currentPrice: number | null;
    currentDigit: number | null;
    digitStats: TDigitStat[];
    evenPercentage: number;
    oddPercentage: number;
    risePercentage: number;
    fallPercentage: number;
    sampleSize: number;
};

const buildSocketURL = () => {
    const server = (getSocketURL() || 'ws.derivws.com').replace(/[^a-zA-Z0-9.]/g, '');
    const app_id = String(getAppId() ?? '').replace(/[^a-zA-Z0-9]/g, '');
    const brand = (website_name || 'deriv').toLowerCase();
    return `wss://${server}/websockets/v3?app_id=${app_id}&l=en&brand=${brand}`;
};

const lastDigitOf = (price: number, decimals: number): number => {
    const fixed = price.toFixed(decimals);
    return Number(fixed[fixed.length - 1]);
};

/**
 * Streams live ticks for a synthetic index straight from Deriv's WebSocket API
 * and derives last-digit / even-odd / rise-fall statistics in real time.
 * Tick data is public market data, so this works with or without an account.
 */
export const useTickAnalysis = (symbol: string, tickCount: number): TTickAnalysis => {
    const [status, setStatus] = useState<TConnectionStatus>('connecting');
    const [prices, setPrices] = useState<number[]>([]);
    const [decimals, setDecimals] = useState<number>(2);

    const ws_ref = useRef<WebSocket | null>(null);
    const reconnect_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
    const keepalive_ref = useRef<ReturnType<typeof setInterval> | null>(null);
    // Latest requested params, used so async handlers ignore stale responses.
    const params_ref = useRef({ symbol, tickCount });
    params_ref.current = { symbol, tickCount };

    useEffect(() => {
        let is_active = true;
        setStatus('connecting');
        setPrices([]);

        const cleanupTimers = () => {
            if (reconnect_ref.current) clearTimeout(reconnect_ref.current);
            if (keepalive_ref.current) clearInterval(keepalive_ref.current);
        };

        const requestHistory = (ws: WebSocket) => {
            ws.send(
                JSON.stringify({
                    ticks_history: symbol,
                    end: 'latest',
                    count: tickCount,
                    style: 'ticks',
                    subscribe: 1,
                })
            );
        };

        const connect = () => {
            if (!is_active) return;
            let ws: WebSocket;
            try {
                ws = new WebSocket(buildSocketURL());
            } catch {
                setStatus('error');
                return;
            }
            ws_ref.current = ws;

            ws.onopen = () => {
                if (!is_active) return;
                setStatus('open');
                requestHistory(ws);
                keepalive_ref.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
                }, 20000);
            };

            ws.onmessage = (event: MessageEvent) => {
                if (!is_active) return;
                let data: Record<string, unknown>;
                try {
                    data = JSON.parse(event.data as string);
                } catch {
                    return;
                }
                const echo = (data.echo_req as { ticks_history?: string; ticks?: string }) || {};
                // Ignore responses for a symbol we are no longer watching.
                const responseSymbol = echo.ticks_history || echo.ticks;
                if (responseSymbol && responseSymbol !== params_ref.current.symbol) return;

                if (data.msg_type === 'history' && data.history) {
                    const history = data.history as { prices: (string | number)[] };
                    const pip_size = typeof data.pip_size === 'number' ? (data.pip_size as number) : 2;
                    setDecimals(pip_size);
                    setPrices((history.prices || []).map(Number));
                } else if (data.msg_type === 'tick' && data.tick) {
                    const tick = data.tick as { quote: number; pip_size?: number };
                    if (typeof tick.pip_size === 'number') setDecimals(tick.pip_size);
                    setPrices(prev => {
                        const next = [...prev, Number(tick.quote)];
                        const limit = params_ref.current.tickCount;
                        return next.length > limit ? next.slice(next.length - limit) : next;
                    });
                } else if (data.msg_type === 'error') {
                    setStatus('error');
                }
            };

            ws.onerror = () => {
                if (is_active) setStatus('error');
            };

            ws.onclose = () => {
                if (!is_active) return;
                setStatus('closed');
                if (keepalive_ref.current) clearInterval(keepalive_ref.current);
                reconnect_ref.current = setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            is_active = false;
            cleanupTimers();
            const ws = ws_ref.current;
            if (ws) {
                try {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ forget_all: 'ticks' }));
                    ws.close();
                } catch {
                    /* no-op */
                }
            }
        };
    }, [symbol, tickCount]);

    return useMemo<TTickAnalysis>(() => {
        const digits = prices.map(p => lastDigitOf(p, decimals));
        const sampleSize = digits.length;

        const counts = new Array(10).fill(0);
        digits.forEach(d => {
            if (d >= 0 && d <= 9) counts[d] += 1;
        });

        const maxCount = sampleSize ? Math.max(...counts) : 0;
        const minCount = sampleSize ? Math.min(...counts) : 0;

        const digitStats: TDigitStat[] = counts.map((count, digit) => ({
            digit,
            count,
            percentage: sampleSize ? (count / sampleSize) * 100 : 0,
            isHighest: sampleSize > 0 && count === maxCount,
            isLowest: sampleSize > 0 && count === minCount,
        }));

        const evenCount = digits.filter(d => d % 2 === 0).length;
        const oddCount = sampleSize - evenCount;

        let riseCount = 0;
        let fallCount = 0;
        for (let i = 1; i < prices.length; i++) {
            if (prices[i] > prices[i - 1]) riseCount += 1;
            else if (prices[i] < prices[i - 1]) fallCount += 1;
        }
        const moveTotal = riseCount + fallCount;

        return {
            status,
            prices,
            digits,
            decimals,
            currentPrice: prices.length ? prices[prices.length - 1] : null,
            currentDigit: digits.length ? digits[digits.length - 1] : null,
            digitStats,
            evenPercentage: sampleSize ? (evenCount / sampleSize) * 100 : 0,
            oddPercentage: sampleSize ? (oddCount / sampleSize) * 100 : 0,
            risePercentage: moveTotal ? (riseCount / moveTotal) * 100 : 0,
            fallPercentage: moveTotal ? (fallCount / moveTotal) * 100 : 0,
            sampleSize,
        };
    }, [prices, decimals, status]);
};
