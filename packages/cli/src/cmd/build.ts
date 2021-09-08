import { CommandConfig } from '../@types/common';
import aegis from '../utils/aegis';
import spawn from '../utils/spawn';
import spinner from '../utils/spinner';

const BuildCmd: CommandConfig = {
  description: '构建打包',
  action: async (args, option, ctx) => {
    const Dep = require('../libs/dependencies').default;
    const dep = new Dep(ctx);
    process.env.NODE_ENV = 'production';

    spinner.info('开始构建');

    aegis.time('build');
    /** 清除构建目录（白名单除外：如 miniprogram_dist） */
    await spawn('npx', ['imp', '--clear']);
    await spawn('npx', ['gulp', 'build']);
    aegis.timeEnd('build');

    spinner.succeed('构建成功');
  },
};

export default BuildCmd;
