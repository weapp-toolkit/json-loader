/* eslint-disable spaced-comment */
/// <reference types="node" />
/// <reference types="webpack" />

import webpack from 'webpack';

declare module 'gulp-print' {
  interface FormatFunction {
    (filepath: string): string;
  }
  interface LogFunction {
    (message: string): void;
  }

  export function setLogFunction(fn: LogFunction): void;
  export default function gulpPrint(format?: FormatFunction): NodeJS.ReadWriteStream;
}

declare module 'webpack-stream' {
  export default function gulpWebpack(
    config?: webpack.Configuration,
    wp?: typeof webpack,
    callback?: any,
  ): NodeJS.ReadWriteStream;
}

declare global {
  interface Function {
    displayName: string;
  }
}
