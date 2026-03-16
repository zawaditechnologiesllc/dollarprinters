import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useStore } from '@/hooks/useStore';
import {
    ActiveSymbolsRequest,
    ServerTimeRequest,
    TicksHistoryResponse,
    TicksStreamRequest,
    TradingTimesRequest,
} from '@deriv/api-types';
import { ChartTitle, SmartChart } from '@deriv/deriv-charts';
import { useDevice } from '@deriv-com/ui';
import ToolbarWidgets from './toolbar-widgets';
import '@deriv/deriv-charts/dist/smartcharts.css';

type TSubscription = {
    [key: string]: null | {
        unsubscribe?: () => void;
    };
};

type TError = null | {
    error?: {
        code?: string;
        message?: string;
    };
};

const subscriptions: TSubscription = {};

const Chart = observer(({ show_digits_stats }: { show_digits_stats: boolean }) => {
    const barriers: [] = [];
    const { common, ui } = useStore();
    const { chart_store, run_panel, dashboard } = useStore();
    const [isSafari, setIsSafari] = useState(false);

    const {
        chart_type,
        getMarketsOrder,
        granularity,
        onSymbolChange,
        setChartStatus,
        symbol,
        updateChartType,
        updateGranularity,
        updateSymbol,
        setChartSubscriptionId,
        chart_subscription_id,
    } = chart_store;
    const chartSubscriptionIdRef = useRef(chart_subscription_id);
    const { isDesktop, isMobile } = useDevice();
    const { is_drawer_open } = run_panel;
    const { is_chart_modal_visible } = dashboard;
    const settings = {
        assetInformation: false,
        countdown: true,
        isHighestLowestMarkerEnabled: false,
        language: common.current_language.toLowerCase(),
        position: ui.is_chart_layout_default ? 'bottom' : 'left',
        theme: ui.is_dark_mode_on ? 'dark' : 'light',
    };

    useEffect(() => {
        const isSafariBrowser = () => {
            const ua = navigator.userAgent.toLowerCase();
            return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1 && ua.indexOf('android') === -1;
        };

        setIsSafari(isSafariBrowser());

        return () => {
            chart_api.api?.forgetAll?.('ticks');
        };
    }, []);

    useEffect(() => {
        chartSubscriptionIdRef.current = chart_subscription_id;
    }, [chart_subscription_id]);

    useEffect(() => {
        if (!symbol) updateSymbol();
    }, [symbol, updateSymbol]);

    const [isConnected, setIsConnected] = useState(!!chart_api?.api);

    useEffect(() => {
        if (chart_api?.api) {
            setIsConnected(true);
            return;
        }
        const interval = setInterval(() => {
            if (chart_api?.api) {
                setIsConnected(true);
                clearInterval(interval);
            }
        }, 300);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isConnected && !symbol) updateSymbol();
    }, [isConnected, symbol, updateSymbol]);

    const requestAPI = (req: ServerTimeRequest | ActiveSymbolsRequest | TradingTimesRequest) => {
        if (!chart_api.api) return Promise.reject(new Error('Chart API not initialized'));
        return chart_api.api.send(req);
    };

    const requestForget = (subscription_id: string) => {
        if (!subscription_id || !chart_api.api) return;
        if (subscriptions[subscription_id]) {
            subscriptions[subscription_id]?.unsubscribe?.();
            subscriptions[subscription_id] = null;
        }
        chart_api.api.forget(subscription_id);
    };

    const requestForgetStream = (subscription_id: string) => {
        if (!subscription_id || !chart_api.api) return;
        chart_api.api.forget(subscription_id);
    };

    const requestSubscribe = async (req: TicksStreamRequest, callback: (data: any) => void) => {
        if (!chart_api.api) return;
        try {
            requestForgetStream(chartSubscriptionIdRef.current);
            const history = await chart_api.api.send(req);
            const sub_id = history?.subscription?.id;
            if (sub_id) {
                setChartSubscriptionId(sub_id);
            }
            if (history) callback(history);
            if (req.subscribe === 1 && sub_id) {
                subscriptions[sub_id] = chart_api.api
                    .onMessage()
                    ?.subscribe(({ data }: { data: TicksHistoryResponse }) => {
                        callback(data);
                    });
            }
        } catch (e) {
            (e as TError)?.error?.code === 'MarketIsClosed' && callback([]);
            console.error('[Chart] requestSubscribe error:', (e as TError)?.error?.message);
        }
    };

    const is_connection_opened = isConnected;

    return (
        <div
            className={classNames('dashboard__chart-wrapper', {
                'dashboard__chart-wrapper--expanded': is_drawer_open && isDesktop,
                'dashboard__chart-wrapper--modal': is_chart_modal_visible && isDesktop,
                'dashboard__chart-wrapper--safari': isSafari,
            })}
            dir='ltr'
        >
            {symbol && (
                <SmartChart
                    id='dbot'
                    barriers={barriers}
                    showLastDigitStats={show_digits_stats}
                    chartControlsWidgets={null}
                    enabledChartFooter={false}
                    chartStatusListener={(v: boolean) => setChartStatus(!v)}
                    toolbarWidget={() => (
                        <ToolbarWidgets
                            updateChartType={updateChartType}
                            updateGranularity={updateGranularity}
                            position={!isDesktop ? 'bottom' : 'top'}
                            isDesktop={isDesktop}
                        />
                    )}
                    chartType={chart_type}
                    isMobile={isMobile}
                    enabledNavigationWidget={isDesktop}
                    granularity={granularity}
                    requestAPI={requestAPI}
                    requestForget={requestForget}
                    requestForgetStream={requestForgetStream}
                    requestSubscribe={requestSubscribe}
                    settings={settings}
                    symbol={symbol}
                    topWidgets={() => <ChartTitle onChange={onSymbolChange} />}
                    isConnectionOpened={is_connection_opened}
                    getMarketsOrder={getMarketsOrder}
                    isLive
                    leftMargin={80}
                />
            )}
        </div>
    );
});

export default Chart;
