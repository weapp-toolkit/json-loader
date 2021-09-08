import chalk from 'chalk';
import { TaskPlugins } from '../libs/gulp-task.class';

const time = () => {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const logPlugin =
  (taskName: string): TaskPlugins =>
  (stream) => {
    return stream.on('end', () => {
      console.log(`[${chalk.gray(time())}] Done     '${chalk.cyan(taskName)}'`);
    });
  };

export default logPlugin;
