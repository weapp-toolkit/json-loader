import globby from 'globby';
import $ from 'lodash';
import { transform } from '@babel/core';
import { LoaderContext } from 'webpack';
import { replaceExt } from '@weapp-toolkit/tools';
import { handleSourceCode } from '../core';
import { Handler, HandlerRunner } from '../handler-runner';
import { loadModule } from '../common';
import { AssetsLoaderOptions } from '..';

export class JavascriptHandler<T extends AssetsLoaderOptions> implements Handler<T> {
  static HANDLER_NAME = 'JavascriptHandler';

  apply(runner: HandlerRunner<T>): void {
    const { loaderContext, loaderOptions, resolver, dependencyGraph } = runner;
    const { context, resourcePath } = loaderContext;

    const entryGraphNode = dependencyGraph.graphNodeIndex.getNodeByRequest(resourcePath);

    runner.hooks.analysisCode.tap(JavascriptHandler.HANDLER_NAME, (sourceCode) => {
      sourceCode = transform(sourceCode, { sourceType: 'module', babelrc: false, comments: false })!.code || '';

      const { code, assets } = handleSourceCode(sourceCode, $.pick(loaderOptions, ['includes', 'excludes']));

      return { code, assets };
    });

    runner.hooks.handleNormalAsset.tapPromise(JavascriptHandler.HANDLER_NAME, async ({ asset, end }) => {
      const request = await resolver.resolveDependency(context, asset.request);

      /** 将原来的引入替换成模块化引入 */
      return end(`require('${request}')`);
    });

    runner.hooks.afterHandleAssets.tapPromise(JavascriptHandler.HANDLER_NAME, async (code) => {
      if (!entryGraphNode) {
        return code;
      }

      /** 添加 entry 的 wxml 等依赖 */
      const assets = Array.from(entryGraphNode.outgoingNodes).filter((node) => !node.isEntryNode());

      await Promise.all(assets.map((asset) => loadModule(runner, asset.resourcePath)));

      return code;
    });
  }
}
