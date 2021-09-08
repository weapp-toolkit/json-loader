import { CommandConfig } from '../@types/common';

const RemoveCmd: CommandConfig = {
  alias: 'rm',
  description: '删除对应分包的 node_modules 和 miniprogram_npm，缺省时删除所有',
  options: [
    {
      flags: '-p,--package-name [packageName...]',
      desc: '指定分包，不设置选项值则进入选择模式',
    },
  ],
  action: async (args, option, ctx) => {
    const npmOperator = require('../libs/npm-operator').default;
    await npmOperator(ctx, {
      operator: 'remove',
      modules: [],
      packageNames: option.packageName === true ? '' : option.packageName,
    });
  },
};

export default RemoveCmd;
