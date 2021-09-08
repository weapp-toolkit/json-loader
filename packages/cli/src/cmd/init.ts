import { CommandConfig } from '../@types/common';

const InitCmd: CommandConfig = {
  description: '在现有项目中初始化',
  action: async (args, option, ctx) => {
    const init = require('../libs/init').default;
    await init(ctx);
  },
};

export default InitCmd;
