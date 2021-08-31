import { runLoaders } from 'loader-runner';
import fs from 'fs';
import path from 'path';

runLoaders(
  {
    // String: 资源的绝对路径 (可以增加查询字符串)
    resource: path.resolve(__dirname, '../../../test/src/libs/log.js'),

    // String[] | {loader, options}[]: loader 的绝对路径 (可以增加查询字符串)
    loaders: [
      {
        loader: path.resolve(__dirname, '../lib/index.js'),
        options: {
          context: process.cwd(),
          appPath: path.resolve(__dirname, '../../../test/src'),
          outputPath: path.resolve(__dirname, '../../../test/dist'),
        },
      },
    ],

    // 基础上下文之外的额外 loader 上下文
    context: {
      // 直接提交文件，提交的文件不会经过后续的chunk、module处理，直接输出到 fs
      emitFile: (
        name: string,
        content: string | Buffer,
        sourceMap?: string,
      ) => {
        // console.log('context, emifile', name, content, sourceMap);
      }
    },

    // 读取资源的函数
    readResource: fs.readFile.bind(fs),
  },
  function (err, result) {
    console.info('[cdn-loader], end, err:', err);
  },
);
