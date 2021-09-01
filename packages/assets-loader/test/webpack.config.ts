import path from 'path';
import webpack from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

const webpackConfig: webpack.Configuration = {
  entry: {
    main: path.resolve(__dirname, './src/main.js'),
    // css: path.resolve(__dirname, './src/index.wxss'),
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
