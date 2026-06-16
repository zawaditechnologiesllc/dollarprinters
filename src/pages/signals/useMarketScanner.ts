import { useEffect, useMemo, useRef, useState } from 'react';
import { getAppId, getSocketURL } from '@/components/shared';
import { website_name } from '@/utils/site-config';
import { ANALYSIS_SYMBOLS } from '../analysis-tool/useTickAnalysis';

export type TMarketSignal = {
    symbol: string;
    name: string;
    sampleSize: number;
    decimals: number;
    lastDigit: number | null;
    evenPercentage: number;
    oddPercentage: number;
    risePercentage: number;
    fallPercentage: number;
    bestDigit: { digit: number; percentage: number };
    /** The single strongest actionable call for this market. */
    topSignal: { type: string; direction: string; confidence: number } | null;
};

export type TScannerStatus = 'connecting' | 'open' | 'error' | 'closed';

const SCAN_TICKS = 120;

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

const buildSignal = (prices: number[], decimals: number, symbol: string, name: string): TMarketSignal => {
    const digits = prices.map(p => lastDigitOf(p, decimals));
    const sampleSize = digits.length;

    const counts = new Array(10).fill(0);
    digits.forEach(d => {
        if (d >= 0 && d <= 9) counts[d] += 1;
    });
    const evenCount = digits.filter(d => d % 2 === 0).length;
    const oddCount = sampleSize - evenCount;

    let riseCount = 0;
    let fallCount = 0;
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) riseCount += 1;
        else if (prices[i] < prices[i - 1]) fallCount += 1;
    }
    const moveTotal = riseCount + fallCount;

    const evenPercentage = sampleSize ? (evenCount / sampleSize) * 100 : 0;
    const oddPercentage = sampleSize ? (oddCount / sampleSize) * 100 : 0;
    const risePercentage = moveTotal ? (riseCount / moveTotal) * 100 : 0;
    const fallPercentage = moveTotal ? (fallCount / moveTotal) * 100 : 0;

    let bestDigitIdx = 0;
    counts.forEach((c, i) => {
        if (c > counts[bestDigitIdx]) bestDigitIdx = i;
    });
    const bestDigit = {
        digit: bestDigitIdx,
        percentage: sampleSize ? (counts[bestDigitIdx] / sampleSize) * 100 : 0,
    };

    // Pick the strongest deviation from a 50/50 (or 10% per digit) baseline.
    const candidates = [
        { type: 'Even/Odd', direction: 'EVEN', confidence: evenPercentage },
        { type: 'Even/Odd', direction: 'ODD', confidence: oddPercentage },
        { type: 'Rise/Fall', direction: 'RISE', confidence: risePercentage },
        { type: 'Rise/Fall', direction: 'FALL', confidence: fallPercentage },
    ];
    const top = candidates.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    const topSignal = sampleSize ? top : null;

    return {
        symbol,
        name,
        sampleSize,
        decimals,
        lastDigit: digits.length ? digits[digits.length - 1] : null,
        evenPercentage,
        oddPercentage,
        risePercentage,
        fallPercentage,
        bestDigit,
        topSignal,
    };
};

/**
 * Opens one WebSocket and subscribes to live ticks for every synthetic index,
 * recomputing a ranked set of signals on each incoming tick.
 */
export const useMarketScanner = () => {
    const [status, setStatus] = useState<TScannerStatus>('connecting');
    const [version, setVersion] = useState(0);

    const prices_ref = useRef<Record<string, number[]>>({});
    const decimals_ref = useRef<Record<string, number>>({});

    useEffect(() => {
        let is_active = true;
        let ws: WebSocket | null = null;
        let reconnect: ReturnType<typeof setTimeout> | null = null;
        let keepalive: ReturnType<typeof setInterval> | null = null;
        let throttle: ReturnType<typeof setTimeout> | null = null;

        const scheduleRender = () => {
            if (throttle) return;
            throttle = setTimeout(() => {
                throttle = null;
                if (is_active) setVersion(v => v + 1);
            }, 400);
        };

        const connect = () => {
            if (!is_active) return;
            setStatus('connecting');
            try {
                ws = new WebSocket(buildSocketURL());
            } catch {
                setStatus('error');
                return;
            }

            ws.onopen = () => {
                if (!is_active || !ws) return;
                setStatus('open');
                ANALYSIS_SYMBOLS.forEach(({ symbol }) => {
                    ws?.send(
                        JSON.stringify({
                            ticks_history: symbol,
                            end: 'latest',
                            count: SCAN_TICKS,
                            style: 'ticks',
                            subscribe: 1,
                        })
                    );
                });
                keepalive = setInterval(() => {
                    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
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
                if (data.msg_type === 'history' && data.history) {
                    const symbol = echo.ticks_history as string;
                    if (!symbol) return;
                    const history = data.history as { prices: (string | number)[] };
                    decimals_ref.current[symbol] = typeof data.pip_size === 'number' ? (data.pip_size as number) : 2;
                    prices_ref.current[symbol] = (history.prices || []).map(Number);
                    scheduleRender();
                } else if (data.msg_type === 'tick' && data.tick) {
                    const tick = data.tick as { quote: number; symbol: string; pip_size?: number };
                    const symbol = tick.symbol;
                    if (!symbol) return;
                    if (typeof tick.pip_size === 'number') decimals_ref.current[symbol] = tick.pip_size;
                    const arr = prices_ref.current[symbol] || [];
                    const next = [...arr, Number(tick.quote)];
                    prices_ref.current[symbol] = next.length > SCAN_TICKS ? next.slice(next.length - SCAN_TICKS) : next;
                    scheduleRender();
                }
            };

            ws.onerror = () => {
                if (is_active) setStatus('error');
            };
            ws.onclose = () => {
                if (!is_active) return;
                setStatus('closed');
                if (keepalive) clearInterval(keepalive);
                reconnect = setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            is_active = false;
            if (reconnect) clearTimeout(reconnect);
            if (keepalive) clearInterval(keepalive);
            if (throttle) clearTimeout(throttle);
            if (ws) {
                try {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ forget_all: 'ticks' }));
                    ws.close();
                } catch {
                    /* no-op */
                }
            }
        };
    }, []);

    const signals = useMemo(() => {
        return ANALYSIS_SYMBOLS.map(({ symbol, name }) =>
            buildSignal(prices_ref.current[symbol] || [], decimals_ref.current[symbol] ?? 2, symbol, name)
        ).sort((a, b) => (b.topSignal?.confidence ?? 0) - (a.topSignal?.confidence ?? 0));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version]);

    return { status, signals };
};
