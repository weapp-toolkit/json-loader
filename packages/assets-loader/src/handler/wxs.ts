import { handleAsset } from '../common';
import { Handler, HandlerRunner } from '../handler-runner';

export class WxsHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'WxsHandler';

  apply(runner: HandlerRunner<T>): void {
    runner.hooks.moduleAsset.tapPromise(WxsHandler.HANDLER_NAME, handleAsset.bind(this, 'WXS_DEPENDENCY', runner));

    runner.hooks.normalAsset.tapPromise(WxsHandler.HANDLER_NAME, handleAsset.bind(this, 'WXS_DEPENDENCY', runner));
  }
}
