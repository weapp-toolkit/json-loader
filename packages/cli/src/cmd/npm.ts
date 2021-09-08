import { CommandConfig } from '../@types/common';
import spinner from '../utils/spinner';

const BuildCmd: CommandConfig = {
  description: '构建 npm',
  action: async (args, option, ctx) => {
    const Dep = require('../libs/dependencies').default;
    const dep = new Dep(ctx);

    spinner.info('开始编译 npm 包');

    await dep.buildNpm();

    spinner.succeed('编译成功');
  },
};

export default BuildCmd;
