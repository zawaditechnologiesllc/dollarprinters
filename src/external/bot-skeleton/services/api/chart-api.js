import { generateDerivApiInstance } from './appId';

class ChartAPI {
    api;
    is_reconnecting = false;

    onsocketclose() {
        this.reconnectIfNotConnected();
    }

    init = async (force_create_connection = false) => {
        if (!this.api || force_create_connection) {
            if (this.api?.connection) {
                this.api.disconnect();
                this.api.connection.removeEventListener('close', this.onsocketclose.bind(this));
            }
            this.api = generateDerivApiInstance();
            this.api?.connection.addEventListener('close', this.onsocketclose.bind(this));
        }
        this.getTime();
    };

    getTime() {
        if (!this.time_interval) {
            this.time_interval = setInterval(() => {
                this.api?.send({ time: 1 });
            }, 30000);
        }
    }

    reconnectIfNotConnected = () => {
        if (this.is_reconnecting) return;
        // eslint-disable-next-line no-console
        console.log('chart connection state: ', this.api?.connection?.readyState);
        if (this.api?.connection?.readyState && this.api?.connection?.readyState > 1) {
            // eslint-disable-next-line no-console
            console.log('Info: Chart connection to the server was closed, trying to reconnect.');
            this.is_reconnecting = true;
            this.init(true).finally(() => {
                this.is_reconnecting = false;
            });
        }
    };
}

const chart_api = new ChartAPI();

export default chart_api;
