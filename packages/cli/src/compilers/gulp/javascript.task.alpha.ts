import { src, dest, watch, TaskFunction } from 'gulp';
import fsx from 'fs-extra';
import path from 'path';

import rename from 'gulp-rename';
import gulpRemove from 'gulp-remove';
import webpack from 'webpack';
import gulpWebpack from 'webpack-stream';
import WebpackBar from 'webpackbar';
import TerserPlugin from 'terser-webpack-plugin';

import { srcRoot, output, option, env, impConfig, entries } from './config';
import { GulpTaskOptions, GulpTask, TaskWatcher } from './libs/gulp-task.class';

const matchAlias = (request: string) => {
  return Object.keys(impConfig.paths).some((_) => request.startsWith(`${_}/`));
};

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
    const nodeEnv = env.NODE_ENV === 'development' ? 'development' : 'production';

    const _compiler: TaskFunction = () => {
      let stream: NodeJS.ReadWriteStream = src('app.js', option)
        .pipe(manifest())
        .pipe(
          gulpWebpack(
            {
              target: 'node',
              mode: nodeEnv,
              devtool: 'cheap-source-map',
              cache: {
                type: 'filesystem',
              },
              entry: entries,
              output: {
                filename: '[name].js',
                path: path.join(process.cwd(), output),
              },
              stats: {
                all: false,
                colors: true,
                errors: true,
                errorDetails: true,
                chunks: false,
              },
              externals: [
                ({ request }, callback) => {
                  // 不处理 node_modules 依赖
                  if (/^[a-zA-Z@]/.test(request) && !matchAlias(request)) {
                    return callback(undefined, `commonjs ${request}`);
                  }
                  callback();
                },
              ],
              resolve: {
                extensions: ['.ts', '.js'],
                alias: impConfig.paths,
              },
              module: {
                rules: [
                  {
                    test: /\.(ts|js)$/,
                    loader: 'babel-loader',
                    exclude: /node_modules/,
                    sideEffects: true,
                    options: impConfig.babelrc,
                  },
                ],
              },
              optimization: {
                splitChunks: {
                  minChunks: 1,
                  minSize: 0, // 强制分chunk..毕竟小程序不需要request加载
                  chunks: 'all',
                  maxInitialRequests: 100,
                  name(m: { resource: string }) {
                    if (m instanceof webpack.NormalModule) {
                      // 放回原目录
                      return path.relative(option.cwd, m.resource.replace(path.extname(m.resource), ''));
                    }
                    return false;
                  },
                },
                minimizer: [
                  new TerserPlugin({
                    terserOptions: {
                      format: {
                        comments: false,
                      },
                    },
                    extractComments: false,
                  }),
                ],
              },
              plugins: [new WebpackBar({})],
            },
            webpack,
          ),
        )
        .on('error', function (this: NodeJS.EventEmitter) {
          // 避免编译中断
          this.emit('end');
        });

      stream = this.applyPlugins(stream, plugins);

      stream
        .pipe(
          rename((newFile, file) => {
            // 保持文件路径完整
            newFile.dirname = path.dirname(path.relative(option.cwd, file.path));
          }),
        )
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
