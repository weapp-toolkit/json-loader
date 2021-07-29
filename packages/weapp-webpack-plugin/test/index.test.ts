import webpack from 'webpack';
import webpackConfig from './webpack.config';

const main = () => {
  const compiler = webpack(webpackConfig);
  compiler.run((e) => {
    if (e) {
      console.error(e);
    }
  });
};

main();
