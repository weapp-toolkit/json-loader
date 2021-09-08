import { CommandConfig } from '../@types/common';

const InitCmd: CommandConfig = {
  description: '初始化新项目',
  argument: '[name]',
  action: async (args, option, ctx) => {
    const name = args[0] || '';
    const create = require('../libs/create').default;
    await create(ctx, {
      name,
    });
  },
};

export default InitCmd;
