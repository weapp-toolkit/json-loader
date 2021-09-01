import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

const webpackConfig: webpack.Configuration = {
  entry: {
    app: path.resolve(__dirname, '../../../test/src/app.js'),
    appJson: path.resolve(__dirname, '../../../test/src/app.json')
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
        test: /\.(json)$/,
        loader: path.resolve(__dirname, '../lib/index.js'),
        exclude: /node_modules/,
        options: {
          preprocessor: {
            app: {
              resizable: true,
            },
            page: {
              backgroundColor: '#ccc'
            }
          }
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
  ],
};

export default webpackConfig;
