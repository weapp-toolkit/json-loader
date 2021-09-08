import del from 'del';
import { OptionConfig } from '../@types/common';
import spinner from '../utils/spinner';

const CleanOption: OptionConfig = {
  alias: 'c',
  description: '清除构建文件',
  action: async (args, ctx) => {
    const { distRoot, config } = ctx;
    spinner.logWithSpinner('正在清除...');

    await del('**/*', {
      cwd: distRoot,
      ignore: config.clearIgnore,
    });
    await del('node_modules/.cache/gulp-remove');

    spinner.succeed('清除完成');
  },
};

export default CleanOption;
