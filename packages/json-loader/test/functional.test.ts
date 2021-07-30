import { runLoaders } from 'loader-runner';
import fs from 'fs';
import path from 'path';

runLoaders(
  {
    // String: 资源的绝对路径 (可以增加查询字符串)
    resource: path.resolve(__dirname, '../../../test/src/app.json'),

    // String[] | {loader, options}[]: loader 的绝对路径 (可以增加查询字符串)
    loaders: [
      {
        loader: path.resolve(__dirname, '../lib/index.js'),
        options: {
          preprocessor: {
            page: {
              backgroundColor: '#f2f2f2'
            }
          }
        },
      },
    ],

    // 基础上下文之外的额外 loader 上下文
    context: {},

    // 读取资源的函数
    readResource: fs.readFile.bind(fs),
  },
  function (err, result) {
    // err: Error?
    // result.result: Buffer | String
    // The result
    console.info('skr: loader result', err, result);
  },
);
