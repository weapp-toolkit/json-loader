import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

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
      '@': path.resolve(__dirname, '../../../test/src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(jpg|png)$/,
        loader: path.resolve(__dirname, '../lib/index.js'),
        exclude: /node_modules/,
        options: {
          cdn: 'https://abcmouse.cdn-go.cn/fex/abcmouse-h5-parents-home/-/c28cbc27/',
          output: '__assets',
        },
      },
    ],
  },
  plugins: [new CleanWebpackPlugin()],
};

export default webpackConfig;
