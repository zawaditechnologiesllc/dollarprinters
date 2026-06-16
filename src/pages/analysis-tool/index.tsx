import React, { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ANALYSIS_SYMBOLS, TICK_COUNT_OPTIONS, useTickAnalysis } from './useTickAnalysis';
import './analysis-tool.scss';

const StatusPill = ({ status }: { status: string }) => {
    const label =
        status === 'open'
            ? 'Live'
            : status === 'connecting'
              ? 'Connecting…'
              : status === 'error'
                ? 'Error'
                : 'Reconnecting…';
    return <span className={`analysis-tool__status analysis-tool__status--${status}`}>{label}</span>;
};

const PercentBar = ({
    label,
    percentage,
    tone,
}: {
    label: string;
    percentage: number;
    tone: 'up' | 'down' | 'even' | 'odd';
}) => (
    <div className='analysis-bar'>
        <div className='analysis-bar__head'>
            <span className='analysis-bar__label'>{label}</span>
            <span className='analysis-bar__value'>{percentage.toFixed(2)}%</span>
        </div>
        <div className='analysis-bar__track'>
            <div className={`analysis-bar__fill analysis-bar__fill--${tone}`} style={{ width: `${percentage}%` }} />
        </div>
    </div>
);

const AnalysisTool = observer(() => {
    const [symbol, setSymbol] = useState<string>(ANALYSIS_SYMBOLS[4].symbol); // Volatility 100 default
    const [tickCount, setTickCount] = useState<number>(100);
    const [barrier, setBarrier] = useState<number>(5);

    const analysis = useTickAnalysis(symbol, tickCount);
    const {
        status,
        digitStats,
        currentPrice,
        currentDigit,
        decimals,
        evenPercentage,
        oddPercentage,
        risePercentage,
        fallPercentage,
        digits,
        sampleSize,
    } = analysis;

    const { overPercentage, underPercentage } = useMemo(() => {
        if (!sampleSize) return { overPercentage: 0, underPercentage: 0 };
        const over = digits.filter(d => d > barrier).length;
        const under = digits.filter(d => d < barrier).length;
        const decisive = over + under;
        return {
            overPercentage: decisive ? (over / decisive) * 100 : 0,
            underPercentage: decisive ? (under / decisive) * 100 : 0,
        };
    }, [digits, barrier, sampleSize]);

    const recommendation = useMemo(() => {
        if (!sampleSize) return null;
        const signals: { label: string; detail: string }[] = [];
        if (evenPercentage >= 55) signals.push({ label: 'EVEN', detail: `${evenPercentage.toFixed(1)}% even` });
        else if (oddPercentage >= 55) signals.push({ label: 'ODD', detail: `${oddPercentage.toFixed(1)}% odd` });
        if (overPercentage >= 58)
            signals.push({ label: `OVER ${barrier}`, detail: `${overPercentage.toFixed(1)}% over` });
        else if (underPercentage >= 58)
            signals.push({ label: `UNDER ${barrier}`, detail: `${underPercentage.toFixed(1)}% under` });
        if (risePercentage >= 58) signals.push({ label: 'RISE', detail: `${risePercentage.toFixed(1)}% rises` });
        else if (fallPercentage >= 58) signals.push({ label: 'FALL', detail: `${fallPercentage.toFixed(1)}% falls` });
        return signals;
    }, [
        sampleSize,
        evenPercentage,
        oddPercentage,
        overPercentage,
        underPercentage,
        risePercentage,
        fallPercentage,
        barrier,
    ]);

    return (
        <div className='analysis-tool'>
            <div className='analysis-tool__toolbar'>
                <div className='analysis-tool__field'>
                    <label htmlFor='at-symbol'>Market</label>
                    <select id='at-symbol' value={symbol} onChange={e => setSymbol(e.target.value)}>
                        {ANALYSIS_SYMBOLS.map(s => (
                            <option key={s.symbol} value={s.symbol}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='analysis-tool__field'>
                    <label htmlFor='at-ticks'>Ticks</label>
                    <select id='at-ticks' value={tickCount} onChange={e => setTickCount(Number(e.target.value))}>
                        {TICK_COUNT_OPTIONS.map(c => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='analysis-tool__field'>
                    <label htmlFor='at-barrier'>Over / Under barrier</label>
                    <select id='at-barrier' value={barrier} onChange={e => setBarrier(Number(e.target.value))}>
                        {Array.from({ length: 9 }, (_, i) => i + 1).map(b => (
                            <option key={b} value={b}>
                                {b}
                            </option>
                        ))}
                    </select>
                </div>
                <div className='analysis-tool__live'>
                    <StatusPill status={status} />
                    <div className='analysis-tool__price'>
                        <span className='analysis-tool__price-label'>Last price</span>
                        <span className='analysis-tool__price-value'>
                            {currentPrice !== null ? currentPrice.toFixed(decimals) : '—'}
                        </span>
                    </div>
                    <div
                        className={`analysis-tool__current-digit ${currentDigit !== null && currentDigit % 2 === 0 ? 'is-even' : 'is-odd'}`}
                    >
                        {currentDigit !== null ? currentDigit : '—'}
                    </div>
                </div>
            </div>

            <div className='analysis-tool__grid'>
                <section className='analysis-card analysis-card--digits'>
                    <header className='analysis-card__header'>
                        <h3>Last Digit Distribution</h3>
                        <span className='analysis-card__meta'>{sampleSize} ticks</span>
                    </header>
                    <div className='digit-grid'>
                        {digitStats.map(stat => (
                            <div
                                key={stat.digit}
                                className={[
                                    'digit-cell',
                                    stat.isHighest ? 'digit-cell--high' : '',
                                    stat.isLowest ? 'digit-cell--low' : '',
                                    currentDigit === stat.digit ? 'digit-cell--current' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                            >
                                <span className='digit-cell__digit'>{stat.digit}</span>
                                <span className='digit-cell__pct'>{stat.percentage.toFixed(1)}%</span>
                                <span
                                    className='digit-cell__bar'
                                    style={{ height: `${Math.min(stat.percentage * 4, 100)}%` }}
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <section className='analysis-card'>
                    <header className='analysis-card__header'>
                        <h3>Even / Odd</h3>
                    </header>
                    <PercentBar label='Even' percentage={evenPercentage} tone='even' />
                    <PercentBar label='Odd' percentage={oddPercentage} tone='odd' />
                </section>

                <section className='analysis-card'>
                    <header className='analysis-card__header'>
                        <h3>Over / Under {barrier}</h3>
                    </header>
                    <PercentBar label={`Over ${barrier}`} percentage={overPercentage} tone='up' />
                    <PercentBar label={`Under ${barrier}`} percentage={underPercentage} tone='down' />
                </section>

                <section className='analysis-card'>
                    <header className='analysis-card__header'>
                        <h3>Rise / Fall</h3>
                    </header>
                    <PercentBar label='Rise' percentage={risePercentage} tone='up' />
                    <PercentBar label='Fall' percentage={fallPercentage} tone='down' />
                </section>

                <section className='analysis-card analysis-card--signal'>
                    <header className='analysis-card__header'>
                        <h3>Live Signal</h3>
                        <span className='analysis-card__meta'>Updated each tick</span>
                    </header>
                    {recommendation && recommendation.length > 0 ? (
                        <div className='signal-list'>
                            {recommendation.map(s => (
                                <div key={s.label} className='signal-chip'>
                                    <span className='signal-chip__label'>{s.label}</span>
                                    <span className='signal-chip__detail'>{s.detail}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className='analysis-card__empty'>
                            {sampleSize ? 'No strong edge right now — market is balanced.' : 'Waiting for live ticks…'}
                        </p>
                    )}
                    <p className='analysis-card__disclaimer'>
                        Signals are statistical observations of recent ticks, not financial advice. Trade responsibly.
                    </p>
                </section>
            </div>
        </div>
    );
});

export default AnalysisTool;
