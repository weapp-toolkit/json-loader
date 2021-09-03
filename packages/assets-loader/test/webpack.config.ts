import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

const webpackConfig: webpack.Configuration = {
  entry: {
    // app: path.resolve(__dirname, './src/main.js'),
    app: path.resolve(__dirname, './src/index.wxml'),
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
      '@': path.resolve(__dirname, './src/')
    }
  },
  module: {
    rules: [
      {
        test: /\.(ts|js|wxs)$/,
        use: [
          path.resolve(__dirname, '../lib/index.js'),
        ],
      },
      {
        test: /\.(wxml)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            },
          },
          'extract-loader',
          {
            loader: path.resolve(__dirname, '../lib/index.js'),
            options: {
              needOutput: true,
            }
          },
        ],
      },
      {
        test: /\.wxss$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
            },
          },
          'extract-loader',
          'css-loader',
        ],
      },
      {
        test: /\.(jpg|png)$/,
        use: ['file-loader'],
      },
    ],
  },
  plugins: [new CleanWebpackPlugin()],
};

export default webpackConfig;
