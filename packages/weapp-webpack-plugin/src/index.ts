import { Compiler, EntryPlugin  } from 'webpack';

export interface IWeappWebpackPluginOption {

}

export default class WeappWebpackPlugin {
  static PLUGIN_NAME = 'weapp-webpack-plugin';

  constructor(option: IWeappWebpackPluginOption = {}) {

  }

  public apply(compiler: Compiler) {
    this.setEntry(compiler);
  }

  private setEntry (compiler: Compiler) {
    /** 使用这个钩子后会干掉 webpack 原本的 entryOption，如果不手动添加 entry，将会没有构造产物 */
    compiler.hooks.entryOption.tap(WeappWebpackPlugin.PLUGIN_NAME, (context, entry) => {
      console.info('skr: entry', entry);
      new EntryPlugin(context, entry.app.import[0], 'app').apply(compiler);

      return true;
    });
  }
}
