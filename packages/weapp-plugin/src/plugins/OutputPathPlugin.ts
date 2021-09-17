import path from 'path';
import { Compiler, NormalModule } from 'webpack';

interface OutputPathPluginOptions {
  context: string;
}

interface IFileInfo {
  module?: NormalModule;
}

/**
 * 处理小程序依赖以及依赖分析
 */
export class OutputPathPlugin {
  static PLUGIN_NAME = 'OutputPathPlugin';

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  constructor(options: OutputPathPluginOptions) {
    this.context = options.context;
  }

  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap(OutputPathPlugin.PLUGIN_NAME, (compilation) => {
      // compilation.hooks.assetPath.tap(OutputPathPlugin.PLUGIN_NAME, (filepath, fileInfo: IFileInfo) => {
      //   if (fileInfo.module instanceof NormalModule) {
      //     return path.relative(this.context, fileInfo.module.resource);
      //   }
      //   return filepath;
      // });
    });
  }
}
