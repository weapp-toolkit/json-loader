import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import WeappPlugin from '../es';

const webpackConfig: webpack.Configuration = {
  entry: {
    app: path.resolve(__dirname, '../../../test/src/app.js'),
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
  },
  target: 'node',
  mode: 'production',
  devtool: 'cheap-source-map',
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, '../../../test/src')
    }
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        use: [
          '@weapp-toolkit/assets-loader',
          {
            loader: 'babel-loader',
            options: {
              presets: [],
              plugins: [],
            },
          }
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(wxml|wxs)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            },
          },
          'extract-loader',
          '@weapp-toolkit/assets-loader',
        ],
      },
      {
        test: /\.(jpg|png)$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name]-[contenthash:8].[ext]',
          },
        },],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new WeappPlugin(),
  ],
};

export default webpackConfig;
