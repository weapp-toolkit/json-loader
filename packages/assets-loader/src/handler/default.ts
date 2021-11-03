import $ from 'lodash';
import { Handler, HandlerRunner, HooksParameter } from '../handler-runner';
import { handleEmit } from '../common';
import { handleSourceCode } from '../core';

/**
 * 当资源没有被任何其他 handler 处理时，会走到 default handler
 */
export class DefaultHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'DefaultHandler';

  apply(runner: HandlerRunner<T>): void {
    const { loaderOptions, loaderContext } = runner;

    runner.hooks.analysisCode.tap(DefaultHandler.HANDLER_NAME, (code) =>
      handleSourceCode(code, $.pick(loaderOptions, ['includes', 'excludes'])),
    );

    runner.hooks.beforeHandleAssets.tap(DefaultHandler.HANDLER_NAME, (code) => code);

    runner.hooks.handleHttpAsset.tap(DefaultHandler.HANDLER_NAME, this.defaultHandle);

    runner.hooks.handleUnknownAsset.tap(DefaultHandler.HANDLER_NAME, this.defaultHandle);

    runner.hooks.handleModuleAsset.tap(DefaultHandler.HANDLER_NAME, this.defaultHandle);

    runner.hooks.handleNormalAsset.tap(DefaultHandler.HANDLER_NAME, this.defaultHandle);

    /**
     * 无法分析运行时代码，这里抛出警告
     */
    runner.hooks.handleGlobAssets.tap(DefaultHandler.HANDLER_NAME, (params) => {
      loaderContext.emitWarning(
        new Error(`[${DefaultHandler.HANDLER_NAME}] 无法解析动态资源引用，请修改源代码：${loaderContext.resourcePath}`),
      );
      return this.defaultHandle(params);
    });

    runner.hooks.afterHandleAssets.tap(DefaultHandler.HANDLER_NAME, handleEmit.bind(this, runner));
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
