const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'cheap-module-source-map' : false,
    entry: {
        index: './src/main.tsx',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isDev ? '[name].js' : '[name].[contenthash:8].js',
        publicPath: '/',
        clean: true,
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
        alias: {
            react: path.resolve('./node_modules/react'),
            'react-dom': path.resolve('./node_modules/react-dom'),
            '@datadog/browser-rum': path.resolve('./node_modules/@datadog/browser-rum/cjs/entries/main.js'),
            '@/external': path.resolve(__dirname, './src/external'),
            '@/components': path.resolve(__dirname, './src/components'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
            '@/utils': path.resolve(__dirname, './src/utils'),
            '@/constants': path.resolve(__dirname, './src/constants'),
            '@/stores': path.resolve(__dirname, './src/stores'),
            '@/pages': path.resolve(__dirname, './src/pages'),
            '@/analytics': path.resolve(__dirname, './src/analytics'),
            '@/types': path.resolve(__dirname, './src/types'),
            '@/Types': path.resolve(__dirname, './src/types'),
            '@/public-path': path.resolve(__dirname, './src/public-path'),
        },
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx|js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                    },
                },
            },
            {
                test: /\.xml$/,
                exclude: /node_modules/,
                use: 'raw-loader',
            },
            {
                test: /\.(scss|css)$/,
                use: [
                    isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: isDev,
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: isDev,
                            sassOptions: {
                                includePaths: [path.resolve(__dirname, 'src')],
                                silenceDeprecations: ['import', 'global-builtin'],
                            },
                        },
                    },
                ],
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|eot|ttf|otf)$/,
                type: 'asset/resource',
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
            filename: 'index.html',
        }),
        ...(isDev
            ? []
            : [
                  new MiniCssExtractPlugin({
                      filename: '[name].[contenthash:8].css',
                  }),
              ]),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'public',
                    to: '.',
                    globOptions: {
                        ignore: ['**/index.html'],
                    },
                    noErrorOnMissing: true,
                },
            ],
        }),
        new webpack.DefinePlugin({
            'process.env.TRANSLATIONS_CDN_URL': JSON.stringify(process.env.TRANSLATIONS_CDN_URL),
            'process.env.R2_PROJECT_NAME': JSON.stringify(process.env.R2_PROJECT_NAME),
            'process.env.CROWDIN_BRANCH_NAME': JSON.stringify(process.env.CROWDIN_BRANCH_NAME),
            'process.env.TRACKJS_TOKEN': JSON.stringify(process.env.TRACKJS_TOKEN),
            'process.env.APP_ENV': JSON.stringify(process.env.APP_ENV),
            'process.env.REF_NAME': JSON.stringify(process.env.REF_NAME),
            'process.env.REMOTE_CONFIG_URL': JSON.stringify(process.env.REMOTE_CONFIG_URL),
            'process.env.GD_CLIENT_ID': JSON.stringify(process.env.GD_CLIENT_ID),
            'process.env.GD_APP_ID': JSON.stringify(process.env.GD_APP_ID),
            'process.env.GD_API_KEY': JSON.stringify(process.env.GD_API_KEY),
        }),
    ],
    devServer: {
        port: 5000,
        host: '0.0.0.0',
        hot: true,
        historyApiFallback: true,
        compress: true,
        allowedHosts: 'all',
        headers: {
            'Cross-Origin-Opener-Policy': 'unsafe-none',
            'Cross-Origin-Embedder-Policy': 'unsafe-none',
            'Cache-Control': 'no-cache',
        },
        proxy: [
            {
                context: ['/api'],
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        ],
        client: {
            overlay: false,
        },
    },
    optimization: {
        splitChunks: isDev
            ? false
            : {
                  chunks: 'all',
              },
    },
    performance: {
        hints: false,
    },
    stats: isDev ? 'minimal' : 'normal',
};
