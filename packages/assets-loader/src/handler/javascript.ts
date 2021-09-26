import { Handler, HandlerRunner } from '../handler-runner';

export class JavascriptHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'JavascriptHandler';

  apply(runner: HandlerRunner<T>): void {
    const { loaderContext, resolver } = runner;
    const { context } = loaderContext;

    runner.hooks.normalAsset.tapPromise(JavascriptHandler.HANDLER_NAME, async ({ asset, end }) => {
      const request = await resolver.resolveDependency(context, asset.request);

      /** 将原来的引入替换成模块化引入 */
      return end(`require('${request}')`);
    });

    /** 默认是输出文件，这里漏给 webpack 处理 */
    runner.hooks.after.tap(JavascriptHandler.HANDLER_NAME, (code) => code);
  }
}
