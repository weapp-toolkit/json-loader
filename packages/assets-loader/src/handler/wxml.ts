import $ from 'lodash';
import { handleSourceCode } from '../core';
import { handleAsset } from '../common';
import { Handler, HandlerRunner } from '../handler-runner';

export class WxmlHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'WxmlHandler';

  apply(runner: HandlerRunner<T>): void {
    runner.hooks.analysisCode.tap(WxmlHandler.HANDLER_NAME, (sourceCode) => {
      /** 删除注释 */
      sourceCode = sourceCode.replace(/<!--[^\0]*?-->/gm, '');

      const { code, assets } = handleSourceCode(sourceCode, $.pick(runner.loaderOptions, ['includes', 'excludes']));

      return { code, assets };
    });

    runner.hooks.handleNormalAsset.tapPromise(
      WxmlHandler.HANDLER_NAME,
      handleAsset.bind(this, 'WXML_DEPENDENCY', runner),
    );
  }
}
