import { src, dest, watch, TaskFunction } from 'gulp';
import fsx from 'fs-extra';
import path from 'path';

import changed from 'gulp-changed';
import cache from 'gulp-cached';
import gulpRemove from 'gulp-remove';

import alias from 'gulp-path-alias';
import { srcRoot, output, option, impConfig } from './config';
import { GulpTaskOptions, GulpTask, TaskWatcher } from './libs/gulp-task.class';
import { relativePath } from './plugins/relative-path.plugin';
import logPlugin from './plugins/log.plugin';

export default class WxmlTask extends GulpTask {
  constructor(options: GulpTaskOptions = {}) {
    const defaultGlob = ['**/*.wxml'];
    super(options, {
      name: 'wxml-task',
      ext: 'wxml',
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
        .pipe(cache(name))
        .pipe(alias({ paths: impConfig.paths }));

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

    return () => {
      const watcher = watch(watchGlob, option, this.compiler);
      watcher.on('unlink', (filepath) => {
        const minRoot = path.basename(srcRoot);
        const distRoot = path.basename(output);
        const target = filepath.replace(minRoot, distRoot);
        fsx.remove(target);
      });
    };
  }
}
