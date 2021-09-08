/* eslint-disable implicit-arrow-linebreak */
import sass from 'gulp-dart-sass';
import less from 'gulp-less';
import lightcss from 'gulp-light-css';
import { impConfig } from './config';
import CssTask from './css.task';
import { GulpTaskOptions } from './libs/gulp-task.class';

interface ExtOptions {
  lightcssIgnores?: string[];
  lightcssIgnoreNodeModules?: boolean;
  lightcssNotPackIgnoredFiles?: boolean;
}

export default class CssPreprocessorTask extends CssTask {
  constructor(options: GulpTaskOptions & ExtOptions = {}) {
    options.plugins = options.plugins || [];
    options.lightcssIgnores = options.lightcssIgnores || ['**/*'];
    const lightcssConfig = {
      ignores: options.lightcssIgnores,
      ignoreNodeModules: options.lightcssIgnoreNodeModules,
      notPackIgnoreFiles: options.lightcssNotPackIgnoredFiles,
    };
    let ext;
    switch (impConfig.cssPreprocessor) {
      case 'sass': {
        ext = 'scss';
        options.plugins.unshift((stream) =>
          stream.pipe(
            lightcss({
              compiler: sass(),
              ...lightcssConfig,
            }),
          ),
        );
        break;
      }
      case 'less': {
        ext = 'less';
        options.plugins.unshift((stream) =>
          stream.pipe(
            lightcss({
              compiler: less(),
              ...lightcssConfig,
            }),
          ),
        );
        break;
      }
      default: {
        ext = 'css';
      }
    }

    super(options, {
      name: 'css-preprocessor-task',
      ext,
      defaultCompileGlob: [`**/*.${ext}`],
      defaultWatchGlob: [`**/*.${ext}`],
    });
  }
}
