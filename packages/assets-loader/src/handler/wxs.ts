import $ from 'lodash';
import { transform } from '@babel/core';
import { handleSourceCode } from '../core';
import { handleAsset } from '../common';
import { Handler, HandlerRunner } from '../handler-runner';

export class WxsHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'WxsHandler';

  apply(runner: HandlerRunner<T>): void {
    runner.hooks.analysisCode.tap(WxsHandler.HANDLER_NAME, (sourceCode) => {
      sourceCode = transform(sourceCode, { sourceType: 'module', comments: false })!.code || '';

      const { code, assets } = handleSourceCode(sourceCode, $.pick(runner.loaderOptions, ['includes', 'excludes']));

      return { code, assets };
    });

    runner.hooks.handleModuleAsset.tapPromise(WxsHandler.HANDLER_NAME, (parameter) =>
      handleAsset({
        identify: 'WXS_DEPENDENCY',
        runner,
        parameter,
      }),
    );

    runner.hooks.handleNormalAsset.tapPromise(WxsHandler.HANDLER_NAME, (parameter) =>
      handleAsset({
        identify: 'WXS_DEPENDENCY',
        runner,
        parameter,
      }),
    );
  }
}
