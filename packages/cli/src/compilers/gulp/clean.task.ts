import { TaskFunction } from 'gulp';
import path from 'path';
import del from 'del';

import { output } from './config';
import { GulpTask, TaskWatcher } from './libs/gulp-task.class';

interface CleanTaskOptions {
  glob?: string[];
  ignore?: string[];
}

export default class CleanTask extends GulpTask {
  glob: string[];

  ignore: string[];

  constructor(options: CleanTaskOptions = {}) {
    const { glob = [], ignore = [] } = options;
    super(
      {},
      {
        name: 'clean-task',
        ext: '*',
        defaultCompileGlob: [],
        defaultWatchGlob: [],
      },
    );
    this.glob = ['**/*'].concat(glob);
    this.ignore = ignore;
  }

  get compiler(): TaskFunction {
    const { name, glob, ignore } = this;

    const _compiler: TaskFunction = () => {
      return del(glob, {
        cwd: path.join(process.cwd(), output),
        ignore,
      });
    };

    // 定义 gulp task 名字
    _compiler.displayName = name;

    return _compiler;
  }

  get watcher(): TaskWatcher {
    return () => {};
  }
}
