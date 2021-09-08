import { src, dest, watch, TaskFunction } from 'gulp';
import fsx from 'fs-extra';
import path from 'path';

import postcss from 'gulp-postcss';
import replace from 'gulp-replace';
import changed from 'gulp-changed';
import cache from 'gulp-cached';
import gulpRemove from 'gulp-remove';
import alias from 'gulp-path-alias';
import plumber from 'gulp-plumber';
import lightcss from 'gulp-light-css';

import { EventEmitter } from 'events';
import { impConfig, srcRoot, output, option } from './config';
import { GulpTaskOptions, GulpTask, GulpTaskExtendsOptions, TaskWatcher } from './libs/gulp-task.class';
import { reportBuildSpeedStart, reportBuildSpeedStartEnd } from '../../utils/aegis';
import { relativePath } from './plugins/relative-path.plugin';
import logPlugin from './plugins/log.plugin';

// 文件数多了之后事件销毁不及时就会达到默认的事件注册上限（10），会抛出警告，这里关闭限制
EventEmitter.defaultMaxListeners = 0;

interface ExtOptions {
  lightcssIgnores?: string[];
  lightcssIgnoreNodeModules?: boolean;
  lightcssNotPackIgnoredFiles?: boolean;
}

export default class CssTask extends GulpTask {
  public _options: GulpTaskOptions & ExtOptions;

  constructor(options: GulpTaskOptions & ExtOptions = {}, extendsOptions?: Partial<GulpTaskExtendsOptions>) {
    options.lightcssIgnores = options.lightcssIgnores || ['**/*'];
    super(
      options,
      Object.assign(
        {
          name: 'css-task',
          ext: 'css',
          defaultCompileGlob: ['**/*.css', '!**/_*.css'],
          defaultWatchGlob: ['**/*.css'],
        },
        extendsOptions,
      ),
    );
    this._options = options;
  }

  get compiler(): TaskFunction {
    const { name, ext, compileGlob, plugins } = this;
    const { manifest, remove } = gulpRemove(name, output, { extension: '.wxss' });

    const _compiler: TaskFunction = (done) => {
      // 避免重复编译
      if (name === 'css-preprocessor-task' && ext === 'css') {
        return done();
      }

      reportBuildSpeedStart(name);
      let stream: NodeJS.ReadWriteStream = src(compileGlob, option)
        .pipe(manifest())
        .pipe(changed(output, { extension: '.wxss' }))
        .pipe(cache(name))
        .pipe(alias({ paths: impConfig.paths }))
        .pipe(plumber());

      stream = this.applyPlugins(stream, [...plugins, logPlugin(name)]);

      stream
        // eslint-disable-next-line function-paren-newline
        .pipe(
          lightcss({
            compiler: postcss(),
            ignores: this._options.lightcssIgnores,
            ignoreNodeModules: this._options.lightcssIgnoreNodeModules,
            notPackIgnoreFiles: this._options.lightcssNotPackIgnoredFiles,
            ext: '.wxss',
          }),
        )
        .pipe(replace(/:root\s\{[^}]*\}?\s*/, ''))
        .pipe(relativePath('.wxss'))
        .pipe(dest(output))
        .on('end', () => {
          remove();
          reportBuildSpeedStartEnd(name);
          done();
        });

      return stream;
    };
    // 定义 gulp task 名字
    _compiler.displayName = name;

    return _compiler;
  }

  get watcher(): TaskWatcher {
    const { name, ext, watchGlob } = this;

    // 避免重复编译
    if (name === 'css-preprocessor-task' && ext === 'css') {
      return () => {};
    }

    return () => {
      const watcher = watch(watchGlob, option, this.compiler);
      // 删除 css 文件时也删除对应的 wxss 文件
      watcher.on('unlink', (filepath) => {
        const minRoot = path.basename(srcRoot);
        const distRoot = path.basename(output);
        const target = filepath.replace(new RegExp(`.${ext}$`, 'gi'), '.wxss').replace(minRoot, distRoot);
        fsx.remove(target);
      });
    };
  }
}
