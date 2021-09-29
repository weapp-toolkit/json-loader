import globby from 'globby';
import { transform } from '@babel/core';
import { LoaderContext } from 'webpack';
import { handleSourceCode } from '../core';
import { Handler, HandlerRunner } from '../handler-runner';
import { loadModule } from '../common';
import { replaceExt } from '../../../core/lib';

export class JavascriptHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'JavascriptHandler';

  apply(runner: HandlerRunner<T>): void {
    const { loaderContext, resolver } = runner;
    const { context, resourcePath } = loaderContext;

    runner.hooks.analysisCode.tap(JavascriptHandler.HANDLER_NAME, (sourceCode) => {
      sourceCode = transform(sourceCode, { sourceType: 'module', comments: false })!.code || '';

      const { code, assets } = handleSourceCode(sourceCode);

      return { code, assets };
    });

    runner.hooks.handleNormalAsset.tapPromise(JavascriptHandler.HANDLER_NAME, async ({ asset, end }) => {
      const request = await resolver.resolveDependency(context, asset.request);

      /** 将原来的引入替换成模块化引入 */
      return end(`require('${request}')`);
    });

    /** 默认是输出文件，这里漏给 webpack 处理 */
    runner.hooks.afterHandleAssets.tapPromise(JavascriptHandler.HANDLER_NAME, async (code) => {
      const { _module, _compilation } = loaderContext;

      /** entry 的 issuer 为 null */
      if (_module && !_compilation?.moduleGraph.getIssuer(_module)) {
        await this.addEntryAssetDependencies(loaderContext);
      }

      return code;
    });
  }

  /**
   * 为 entry 添加同名静态资源依赖（wxml、json、wxss等）
   * @param loaderContext
   */
  private async addEntryAssetDependencies(loaderContext: LoaderContext<T>): Promise<void> {
    const request = loaderContext.resourcePath;
    const assets = globby.sync(replaceExt(request, '.{wxml,json,wxss,css,less,scss,sass,styl,stylus,postcss}'));

    await Promise.all(assets.map((asset) => loadModule(loaderContext, asset)));
  }
}
