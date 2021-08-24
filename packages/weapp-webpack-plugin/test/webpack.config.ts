import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import WeappWebpackPlugin from '../es';

const webpackConfig: webpack.Configuration = {
  entry: {
    app: path.resolve(__dirname, '../../../test/src/app.js'),
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js',
  },
  target: 'node',
  mode: 'development',
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
