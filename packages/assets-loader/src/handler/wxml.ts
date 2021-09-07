import shortid from 'shortid';
import { getAssetType } from '@weapp-toolkit/core';
import { Handler, HandlerRunner } from '../handler-runner';

interface WxmlHandlerOption {
  esModule?: boolean;
}

export class WxmlHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'WxmlHandler';

  private esModule: boolean;

  constructor(options: WxmlHandlerOption) {
    this.esModule = options.esModule || true;
  }

  apply(runner: HandlerRunner<T>): void {
    const { esModule } = this;
    const { loaderContext, resolve } = runner;
    const { context } = loaderContext;

    runner.hooks.before.tap(WxmlHandler.HANDLER_NAME, (code) => {
      return esModule ? `export default \`${code}\`;` : `module.exports = \`${code}\``;
    });

    runner.hooks.normalAsset.tapPromise(WxmlHandler.HANDLER_NAME, async ({ asset, end }) => {
      const request = await resolve.resolveDependency(context, asset.request);
      // const assetType = getAssetType(request);

      // /** wxs 不需要模块化，但需要打包 */
      // if (assetType === 'wxs') {
      //   loaderContext.addBuildDependency(request);
      //   loaderContext.loadModule(request, () => {});
      //   return end(asset.code);
      // }

      const placeholder = `___WXML_DEPENDENCY_${shortid().replace('-', '_')}___`;
      const dependency = `
        var ${placeholder} = require('${request}');
      `;

      return dependency + end(`"\` + ${placeholder} + \`"`);
    });
  }
}
