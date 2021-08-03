import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import WeappWebpackPlugin from '../lib/index.js';

const webpackConfig: webpack.Configuration = {
  entry: {
    app: path.resolve(__dirname, '../../../test/src/app.js'),
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
  },
  target: 'node',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: [],
          plugins: [],
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new WeappWebpackPlugin(),
  ],
};

export default webpackConfig;
