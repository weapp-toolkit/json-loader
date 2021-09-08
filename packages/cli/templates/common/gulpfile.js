/**
 * @docs https://git.woa.com/imweb/imweb-miniprogram-cli
 */

const { series, task } = require('gulp');
const { gulpCompiler } = require('@tencent/imweb-miniprogram-cli');

const { CssTask, CssPreprocessorTask, CopyTask, JavascriptTask, WxmlTask } = gulpCompiler;
const cssConfig = {
  lightcssIgnores: ['**/_vars.*', '**/_mixins.*'], // 预处理器处理的 @import 依赖，一般填入只在编译时用的
  lightcssIgnoreNodeModules: true, // default: true，让预处理器处理 NodeModules
  lightcssNotPackIgnoredFiles: false, // default: false, 开启后不会打包 lightcssIgnores 里面的文件
};

const cssTask = new CssTask(cssConfig);
const cssPreprocessorTask = new CssPreprocessorTask(cssConfig);
const javascriptTask = new JavascriptTask();
const wxmlTask = new WxmlTask();
const copyTask = new CopyTask();

const watchTask = (cb) => {
  cssPreprocessorTask.watcher();
  cssTask.watcher();
  wxmlTask.watcher();
  javascriptTask.watcher();
  copyTask.watcher();
  cb();
};

task('build', series(cssPreprocessorTask.compiler, cssTask.compiler, wxmlTask.compiler, javascriptTask.compiler, copyTask.compiler));

task('dev', series('build', watchTask));

task('default', series('dev'));
