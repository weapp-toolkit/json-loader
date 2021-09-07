import { Handler, HandlerRunner } from '../handler-runner';

interface JavascriptHandlerOption {
  esModule?: boolean;
}

export class JavascriptHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'JavascriptHandler';

  private esModule: boolean;

  constructor(options: JavascriptHandlerOption) {
    this.esModule = options.esModule || true;
  }

  apply(runner: HandlerRunner<T>): void {
    const { loaderContext, resolve } = runner;
    const { context } = loaderContext;

    runner.hooks.normalAsset.tapPromise(JavascriptHandler.HANDLER_NAME, async ({ asset, end }) => {
      const request = await resolve.resolveDependency(context, asset.request);

      /** 将原来的引入替换成模块化引入 */
      return end(`require('${request}')`);
    });
  }
}
