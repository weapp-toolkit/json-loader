import webpack from 'webpack';
import webpackConfig from './webpack.config';

const main = () => {
  const compiler = webpack(webpackConfig);

  /** 不输出日志，不知道为什么 */
  compiler.run((e) => {
    if (e) {
      console.error(e);
    }
  });
};

main();
