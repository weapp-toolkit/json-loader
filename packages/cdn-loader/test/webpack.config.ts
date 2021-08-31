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
      '@': path.resolve(__dirname, '../../../test/src')
    }
  },
  module: {
    rules: [
      {
        test: /\.(jpg|png)$/,
        loader: path.resolve(__dirname, '../lib/index.js'),
        exclude: /node_modules/,
        options: {
          appPath: path.resolve(__dirname, '../../../test/src'),
          context: process.cwd(),
          outputPath: path.resolve(__dirname, '../../../test/dist'),
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
  ],
};

export default webpackConfig;
