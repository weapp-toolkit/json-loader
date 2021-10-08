import $ from 'lodash';
import { handleAsset, handleEmit } from '../common';
import { COMMENT_MATCHER, handleSourceCode } from '../core';
import { Handler, HandlerRunner } from '../handler-runner';
import { AssetsLoaderOptions } from '..';

export class CssHandler<T extends AssetsLoaderOptions> implements Handler<T> {
  static HANDLER_NAME = 'CssHandler';

  apply(runner: HandlerRunner<T>): void {
    runner.hooks.analysisCode.tap(CssHandler.HANDLER_NAME, (sourceCode) => {
      const urlImportMap = new Map<string, string>();

      /** 替换 url 为占位符 */
      sourceCode = sourceCode.replace(/url\s*\(.*?\)/g, (match) => {
        const placeholder = `___HTTP_URI_${urlImportMap.size}___`;
        urlImportMap.set(placeholder, match);
        return placeholder;
      });
      /** 删除注释 */
      sourceCode = sourceCode.replace(COMMENT_MATCHER, '');
      /** 恢复 url 源码 */
      urlImportMap.forEach((url, placeholder) => {
        sourceCode = sourceCode.replace(placeholder, url);
      });

      return handleSourceCode(sourceCode, $.pick(runner.loaderOptions, ['includes', 'excludes']));
    });

    runner.hooks.beforeHandleAssets.tap(CssHandler.HANDLER_NAME, (code) => {
      console.info('skr: css', code);
      return code;
    });

    runner.hooks.handleModuleAsset.tapPromise(
      CssHandler.HANDLER_NAME,
      handleAsset.bind(this, 'CSS_DEPENDENCY', runner),
    );

    runner.hooks.afterHandleAssets.tap(CssHandler.HANDLER_NAME, (code) => handleEmit(runner, code, '.wxss'));
  }
}
