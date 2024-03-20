const path = require('path');

const DotenvPlugin = require('dotenv-webpack');
const ESLintPlugin = require('eslint-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CreateFilePlugin = require('create-file-webpack');

const packageJson = require('./package.json');

module.exports = {
    context: path.resolve(__dirname),
    entry: {
        'extension/service-worker': './src/extension/service-worker.ts',
        'extension/content-script': './src/extension/content-script.ts',
        'extension/popup': './src/extension/popup.ts',
        'extension/options': './src/extension/options.ts',
        'extension/panel': './src/extension/panel.ts',
    },
    module: {
        rules: [
            {
                test: /\.(js|ts)x?$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },
            {
                test: /styles\/[^/]+\.(scss|css)$/,
                exclude: /node_modules/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
            },
            {
                test: /\.(scss|css)$/,
                exclude: [/node_modules/, /styles/],
                use: [
                    'lit-css-loader',
                    {
                        loader: 'sass-loader',
                        options: { sassOptions: { outputStyle: 'compressed' } },
                    },
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    plugins: [
        new DotenvPlugin({ systemvars: true }),
        new ESLintPlugin({
            extensions: ['js', 'ts'],
            overrideConfigFile: path.resolve(__dirname, '.eslintrc'),
        }),
        new MiniCssExtractPlugin({
            filename: (pathData) => {
                const { name: chunkName, runtime } = pathData.chunk || {};
                const name = chunkName ?? runtime ?? '';
                const file = path.basename(name);
                const dirname = path.dirname(name);
                return `${dirname}/styles/${file}.css`;
            },
        }),
        new CopyPlugin({
            patterns: [{ from: 'static' }],
        }),
        new CreateFilePlugin({
            path: './dist',
            fileName: 'manifest.json',
            content: (() => {
                const { name, description, version, extension } = packageJson;
                const manifest = {
                    name,
                    description,
                    version,
                    ...extension,
                    manifest_version: 3,
                };
                return JSON.stringify(manifest);
            })(),
        }),
    ],
};
