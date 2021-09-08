import { CommandConfig } from '../@types/common';

const uninstallCmd: CommandConfig = {
  alias: 'uni',
  description: '卸载 npm 包',
  argument: '<modules...>',
  options: [
    {
      flags: '-p,--package-name [packageName]',
      desc: '指定分包，默认为主包，不设置选项值则进入选择模式',
      required: true,
    },
  ],
  action: async (args, option, ctx) => {
    const npmOperator = require('../libs/npm-operator').default;
    await npmOperator(ctx, {
      operator: 'uninstall',
      modules: args[0],
      // -p 不指定值的时候返回 true
      packageName: option.packageName === true ? '' : option.packageName,
    });
  },
};

export default uninstallCmd;
