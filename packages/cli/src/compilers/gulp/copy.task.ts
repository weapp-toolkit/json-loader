import { src, dest, watch, TaskFunction } from 'gulp';
import fsx from 'fs-extra';
import path from 'path';

import changed from 'gulp-changed';
import cache from 'gulp-cached';
import gulpRemove from 'gulp-remove';

import { srcRoot, output, option, ignoreNodeModules } from './config';
import { GulpTaskOptions, GulpTask, TaskWatcher } from './libs/gulp-task.class';
import { relativePath } from './plugins/relative-path.plugin';
import logPlugin from './plugins/log.plugin';

const watchDirectoryDelete = ['**/*'].concat(ignoreNodeModules);

export default class CopyTask extends GulpTask {
  constructor(options: GulpTaskOptions = {}) {
    const defaultGlob = ['**/*', '!**/*.{js,ts,css,less,scss,styl,stylus,wxml}'];
    super(options, {
      name: 'copy-task',
      ext: '*',
      defaultCompileGlob: defaultGlob,
      defaultWatchGlob: defaultGlob,
    });
  }

  get compiler(): TaskFunction {
    const { name, plugins, compileGlob } = this;
    const { manifest, remove } = gulpRemove(name, output);

    const _compiler: TaskFunction = () => {
      let stream: NodeJS.ReadWriteStream = src(compileGlob, option)
        .pipe(manifest())
        .pipe(changed(output))
        .pipe(cache(name));

      stream = this.applyPlugins(stream, [...plugins, logPlugin(name)]);

      stream
        .pipe(relativePath())
        .pipe(dest(output))
        .on('end', () => {
          remove();
        });

      return stream;
    };

    // 定义 gulp task 名字
    _compiler.displayName = name;

    return _compiler;
  }

  get watcher(): TaskWatcher {
    const { watchGlob } = this;

    const deletePath = (filepath: string) => {
      const minRoot = path.basename(srcRoot);
      const distRoot = path.basename(output);
      const target = filepath.replace(minRoot, distRoot);
      fsx.remove(target);
    };

    return () => {
      watch(watchGlob, option, this.compiler);
      const watcherAll = watch(watchDirectoryDelete, option);
      // 同时删除 dist 目录文件
      watcherAll.on('unlink', deletePath);
      watcherAll.on('unlinkDir', deletePath);
    };
  }
}
