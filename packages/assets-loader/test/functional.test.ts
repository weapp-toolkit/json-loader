import { runLoaders } from 'loader-runner';
import fs from 'fs';
import path from 'path';

runLoaders(
  {
    // String: 资源的绝对路径 (可以增加查询字符串)
    resource: path.resolve(__dirname, './src/main.js'),

    // String[] | {loader, options}[]: loader 的绝对路径 (可以增加查询字符串)
    loaders: [
      {
        loader: path.resolve(__dirname, '../lib/index.js'),
      },
    ],

    // 基础上下文之外的额外 loader 上下文
    context: {
      _compiler: {
        options: {
          entry: {
            app: {
              import: [path.resolve(__dirname, './src/main.js')],
            },
          },
        },
      },
      getOptions() {
        return {};
      },
      getResolve() {
        return function (context: string, request: string) {
          return path.resolve(context, request);
        };
      },
      loadModule() {},
    },

    // 读取资源的函数
    readResource: fs.readFile.bind(fs),
  },
  function (err, result) {
    // err: Error?
    // result.result: Buffer | String
    // The result
    if (err) {
      console.error(err);
    }
  },
);
