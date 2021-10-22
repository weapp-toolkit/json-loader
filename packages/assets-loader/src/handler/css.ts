import $ from 'lodash';
import { handleAsset, handleEmit } from '../common';
import { COMMENT_MATCHER, handleSourceCode, HTTP_MATCHER, MODULE_MATCHER, NORMAL_MATCHER } from '../core';
import { Handler, HandlerRunner } from '../handler-runner';
import { AssetsLoaderOptions } from '..';
import { HttpAsset, ModuleAsset, NormalAsset, UnknownAsset } from '../modules/asset';

const CSS_URL_MATCHER = /(?<=url)\s*\(\s*[^()]*?\.\w+\s*\)/g;

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

      return handleSourceCode(
        sourceCode,
        $.assign(
          {
            matcher: CSS_URL_MATCHER,
            handler: (code: string) => {
              code = code.replace(/\s\r\t\n/g, '');
              const request = code.replace(/^['"`(]/, '').replace(/['"`)]$/, '');

              if (HTTP_MATCHER.test(request)) {
                return new HttpAsset({
                  request,
                  code: request,
                });
              }

              if (MODULE_MATCHER.test(request)) {
                return new ModuleAsset({
                  request: code.match(/(?<=['"`])(.*?)(?=['"`])/)![0],
                  code: code.match(/['"`](.*?)['"`]/)![0],
                });
              }

              if (NORMAL_MATCHER.test(request)) {
                return new NormalAsset({
                  request,
                  code: request,
                });
              }

              return new UnknownAsset({
                request,
                code: request,
              });
            },
          },
          $.pick(runner.loaderOptions, ['includes', 'excludes']),
        ),
      );
    });

    runner.hooks.handleModuleAsset.tapPromise(CssHandler.HANDLER_NAME, (parameter) =>
      handleAsset({
        identify: 'CSS_DEPENDENCY',
        runner,
        parameter,
      }),
    );

    runner.hooks.handleNormalAsset.tapPromise(CssHandler.HANDLER_NAME, (parameter) =>
      handleAsset({
        identify: 'CSS_DEPENDENCY',
        runner,
        parameter,
        shouldLoadModule: false,
      }),
    );

    runner.hooks.afterHandleAssets.tap(CssHandler.HANDLER_NAME, (code) => handleEmit(runner, code, '.wxss'));
  }
}
