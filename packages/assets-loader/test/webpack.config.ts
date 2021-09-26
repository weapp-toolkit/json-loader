import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

const webpackConfig: webpack.Configuration = {
  entry: {
    app: [path.resolve(__dirname, './src/main.js'), path.resolve(__dirname, './src/index.wxss')],
    // app: path.resolve(__dirname, './src/index.wxs'),
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
      '@': path.resolve(__dirname, './src/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|js|wxml|wxs)$/,
        use: [path.resolve(__dirname, '../lib/index.js')],
      },
      {
        test: /\.wxss$/,
        use: [path.resolve(__dirname, '../lib/index.js'), 'extract-loader', 'css-loader'],
      },
      {
        test: /\.(jpg|png)$/,
        use: [
          {
            // loader: 'file-loader',
            loader: path.resolve(__dirname, '../../cdn-loader'),
            options: {
              cdn: 'https://raw.abcmouse.com',
              name: 'cdn/[name]-[contenthash:8].[ext]',
            },
          },
        ],
      },
    ],
  },
  plugins: [new CleanWebpackPlugin()],
};

export default webpackConfig;
