import webpack from 'webpack';
import webpackConfig from './webpack.config';

webpack(webpackConfig, (err, stats) => {
  if (err || stats?.hasErrors()) {
    // 在这里处理错误
    console.error(err || stats);
  }

  console.log(
    stats?.toString({
      colors: true,
    }),
  );
  // 处理完成
});
