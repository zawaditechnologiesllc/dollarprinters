import { observer } from 'mobx-react-lite';
import { useMarketScanner } from './useMarketScanner';
import './signals.scss';

const confidenceTone = (confidence: number) => {
    if (confidence >= 60) return 'strong';
    if (confidence >= 55) return 'moderate';
    return 'weak';
};

const Signals = observer(() => {
    const { status, signals } = useMarketScanner();

    const statusLabel =
        status === 'open'
            ? 'Live scan'
            : status === 'connecting'
              ? 'Connecting…'
              : status === 'error'
                ? 'Connection error'
                : 'Reconnecting…';

    return (
        <div className='signals'>
            <header className='signals__header'>
                <div>
                    <h2 className='signals__title'>Market Signals</h2>
                    <p className='signals__subtitle'>
                        Live statistical scan across all volatility indices, ranked by the strongest edge.
                    </p>
                </div>
                <span className={`signals__status signals__status--${status}`}>{statusLabel}</span>
            </header>

            <div className='signals__grid'>
                {signals.map(signal => {
                    const tone = signal.topSignal ? confidenceTone(signal.topSignal.confidence) : 'weak';
                    return (
                        <article key={signal.symbol} className={`signal-market signal-market--${tone}`}>
                            <header className='signal-market__head'>
                                <div className='signal-market__name'>{signal.name}</div>
                                {signal.lastDigit !== null && (
                                    <span
                                        className={`signal-market__digit ${signal.lastDigit % 2 === 0 ? 'is-even' : 'is-odd'}`}
                                    >
                                        {signal.lastDigit}
                                    </span>
                                )}
                            </header>

                            {signal.topSignal && signal.sampleSize ? (
                                <div className='signal-market__call'>
                                    <span className='signal-market__call-type'>{signal.topSignal.type}</span>
                                    <span className='signal-market__call-dir'>{signal.topSignal.direction}</span>
                                    <span className='signal-market__call-conf'>
                                        {signal.topSignal.confidence.toFixed(1)}%
                                    </span>
                                </div>
                            ) : (
                                <div className='signal-market__call signal-market__call--empty'>Waiting for ticks…</div>
                            )}

                            <ul className='signal-market__stats'>
                                <li>
                                    <span>Even</span>
                                    <strong>{signal.evenPercentage.toFixed(1)}%</strong>
                                </li>
                                <li>
                                    <span>Odd</span>
                                    <strong>{signal.oddPercentage.toFixed(1)}%</strong>
                                </li>
                                <li>
                                    <span>Rise</span>
                                    <strong>{signal.risePercentage.toFixed(1)}%</strong>
                                </li>
                                <li>
                                    <span>Fall</span>
                                    <strong>{signal.fallPercentage.toFixed(1)}%</strong>
                                </li>
                                <li>
                                    <span>Hot digit</span>
                                    <strong>
                                        {signal.bestDigit.digit} · {signal.bestDigit.percentage.toFixed(1)}%
                                    </strong>
                                </li>
                            </ul>
                        </article>
                    );
                })}
            </div>

            <p className='signals__disclaimer'>
                Signals are derived from recent tick statistics for educational purposes only and are not financial
                advice. Past performance does not guarantee future results. Trade responsibly.
            </p>
        </div>
    );
});

export default Signals;
