import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import WeappPlugin from '../lib';

const projectPath = path.resolve(__dirname, '../../../test');
const webpackConfig: webpack.Configuration = {
  entry: {
    app: path.resolve(projectPath, 'src/app.ts'),
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
  },
  stats: {
    errors: true,
    warnings: true,
    chunks: false,
    assets: false,
    modules: false,
  },
  watch: true,
  target: 'node',
  mode: 'production',
  optimization: {
    usedExports: true,
    concatenateModules: false,
  },
  devtool: 'cheap-source-map',
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '../../../test/src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        use: [
          '@weapp-toolkit/assets-loader',
          {
            loader: 'babel-loader',
            options: require('../../../babel.config'),
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(json)$/,
        use: [
          '@weapp-toolkit/assets-loader',
          {
            loader: '@weapp-toolkit/json-loader',
            options: {
              emit: false,
              preprocessor: {
                page: {
                  backgroundColor: '#f2f2f2',
                },
              },
            },
          },
        ],
      },
      {
        test: /\.(wxss|css)$/,
        use: ['@weapp-toolkit/assets-loader', 'extract-loader', 'css-loader'],
      },
      {
        test: /\.(less)$/,
        use: ['@weapp-toolkit/assets-loader', 'extract-loader', 'css-loader', 'less-loader'],
      },
      {
        test: /\.(wxml|wxs)$/,
        use: ['@weapp-toolkit/assets-loader'],
      },
      {
        test: /\.(otf|woff|png|jpe?g|svg|gif|webp)$/,
        use: [
          {
            loader: '@weapp-toolkit/cdn-loader',
            options: {
              cdn: 'https://raw.abcmouse.qq.com/',
              name: 'cdn/[name].[contenthash:8].[ext]',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new WeappPlugin({
      ignores: [],
    }),
  ],
};

export default webpackConfig;
