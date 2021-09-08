import { CommandConfig } from '../@types/common';

const InstallCmd: CommandConfig = {
  alias: 'i',
  description: '安装 npm 包，直接运行则进行初始化安装',
  argument: '[modules...]',
  options: [
    {
      flags: '-p,--package-name [packageName]',
      desc: '指定分包，默认为主包，不设置选项值则进入选择模式',
    },
    {
      flags: '-D,--save-dev',
      desc: '是否开发环境依赖',
    },
  ],
  action: async (args, option, ctx) => {
    const npmOperator = require('../libs/npm-operator').default;
    await npmOperator(ctx, {
      operator: 'install',
      modules: args[0],
      // -p 不指定值的时候返回 true
      packageName: option.packageName === true ? '' : option.packageName,
      saveDev: option.saveDev,
    });
  },
};

export default InstallCmd;
