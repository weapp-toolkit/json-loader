import { shortid } from '@weapp-toolkit/core';
import { Handler, HandlerRunner, HooksParameter } from '../handler-runner';

interface WxsHandlerOption {
  esModule?: boolean;
}

export class WxsHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'WxsHandler';

  private esModule: boolean;

  constructor(options: WxsHandlerOption) {
    this.esModule = options.esModule || true;
  }

  apply(runner: HandlerRunner<T>): void {
    const { esModule } = this;

    runner.hooks.before.tap(WxsHandler.HANDLER_NAME, (code) => {
      return esModule ? `export default \`${code}\`;` : `module.exports = \`${code}\``;
    });

    runner.hooks.moduleAsset.tapPromise(WxsHandler.HANDLER_NAME, this.handleAsset.bind(this, runner));

    runner.hooks.normalAsset.tapPromise(WxsHandler.HANDLER_NAME, this.handleAsset.bind(this, runner));
  }

  private async handleAsset(runner: HandlerRunner<T>, parameter: HooksParameter) {
    const { loaderContext, resolve } = runner;
    const { context } = loaderContext;
    const { asset, end } = parameter;

    const request = await resolve.resolveDependency(context, asset.request);

    const placeholder = `___WXS_DEPENDENCY_${shortid()}___`;
    const dependency = `
      var ${placeholder} = require('${request}');
    `;

    return dependency + end(`"\` + ${placeholder} + \`"`);
  }
}
