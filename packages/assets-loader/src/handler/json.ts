import path from 'path';
import { handleAsset } from '../common';
import { Handler, HandlerRunner } from '../handler-runner';

export class JsonHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'JsonHandler';

  apply(runner: HandlerRunner<T>): void {
    const { loaderContext, appRoot } = runner;
    const { resourcePath } = loaderContext;

    runner.hooks.normalAsset.tapPromise(JsonHandler.HANDLER_NAME, handleAsset.bind(this, 'JSON_DEPENDENCY', runner));

    runner.hooks.after.tap(JsonHandler.HANDLER_NAME, (code) => {
      const filename = path.relative(appRoot, resourcePath);

      /** 生成文件 */
      loaderContext.emitFile(filename, code, undefined, {
        placeholderMap: runner.placeholderMap,
      });

      /** json 需要透传给 webpack */
      return code;
    });
  }
}
