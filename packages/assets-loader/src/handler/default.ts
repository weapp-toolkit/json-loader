import fs from 'fs';
import path from 'path';
import globby from 'globby';
import { Handler, HandlerRunner, HooksParameter } from '../handler-runner';

/**
 * 当资源没有被任何其他 handler 处理时，会走到 default handler
 */
export class DefaultHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'DefaultHandler';

  apply(runner: HandlerRunner<T>): void {
    const { loaderContext, resolve } = runner;
    const { context } = loaderContext;

    runner.hooks.before.tap(DefaultHandler.HANDLER_NAME, (code) => code);

    runner.hooks.httpAsset.tap(DefaultHandler.HANDLER_NAME, this.defaultHandle);

    runner.hooks.unknownAsset.tap(DefaultHandler.HANDLER_NAME, this.defaultHandle);

    runner.hooks.moduleAsset.tap(DefaultHandler.HANDLER_NAME, this.defaultHandle);

    runner.hooks.normalAsset.tap(DefaultHandler.HANDLER_NAME, this.defaultHandle);

    runner.hooks.globAssets.tapPromise(DefaultHandler.HANDLER_NAME, async ({ asset, end }) => {
      const requests = globby.sync(asset.request, {
        cwd: context,
      });

      await Promise.all(
        requests.map(async (request) => {
          const resolvedRequest = await resolve.resolveDependency(context, `./${request}`);
          const relativePath = path.relative(context, resolvedRequest);

          /** 没处理，webpack 不会管，所以也不用手动加依赖 */
          // loaderContext.addDependency(resolvedRequest);
          /** 无法处理，直接按照相对路径生成 */
          loaderContext.emitFile(relativePath, fs.readFileSync(resolvedRequest));
        }),
      );

      /** 还原 */
      return end(asset.code);
    });

    runner.hooks.after.tap(DefaultHandler.HANDLER_NAME, (code) => code);
  }

  /**
   * 源码被插入了占位符，还原源码
   * @param context
   * @returns
   */
  private defaultHandle(context: HooksParameter) {
    const { end, asset } = context;
    return end(asset.code);
  }
}
