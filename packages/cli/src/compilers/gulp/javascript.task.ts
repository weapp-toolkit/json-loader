import { src, dest, watch, TaskFunction } from 'gulp';
import fsx from 'fs-extra';
import path from 'path';

import gulpRemove from 'gulp-remove';
import changed from 'gulp-changed';
import alias from 'gulp-path-alias';
import babel from 'gulp-babel';
import { srcRoot, output, option, impConfig } from './config';
import { GulpTaskOptions, GulpTask, TaskWatcher } from './libs/gulp-task.class';
import logPlugin from './plugins/log.plugin';
import { relativePath } from './plugins/relative-path.plugin';

export default class JavascriptTask extends GulpTask {
  constructor(options: GulpTaskOptions = {}) {
    const defaultGlob = ['**/*.{js,ts}'];
    super(options, {
      name: 'javascript-task',
      ext: 'js',
      defaultCompileGlob: defaultGlob,
      defaultWatchGlob: defaultGlob,
    });
  }

  get compiler(): TaskFunction {
    const { name, plugins } = this;
    const { manifest, remove } = gulpRemove(name, output, { extension: '.js' });

    const _compiler: TaskFunction = () => {
      let stream: NodeJS.ReadWriteStream = src(this.compileGlob, option)
        .pipe(manifest())
        .pipe(changed(output))
        .pipe(alias({ paths: impConfig.paths }));

      stream = this.applyPlugins(stream, [...plugins, logPlugin(name)]);

      stream
        .pipe(babel(impConfig.babelrc))
        .on('error', function (this: NodeJS.EventEmitter, e) {
          console.error(e);
          // 避免编译中断
          this.emit('end');
        })
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
        const mapFile = `${target}.map`;
        fsx.remove(target);
        fsx.remove(mapFile);
      });
    };
  }
}
