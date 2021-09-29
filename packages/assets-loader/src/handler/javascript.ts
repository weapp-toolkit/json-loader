import path from 'path';
import { parse } from '@babel/parser';
import { transform } from '@babel/core';
import traverse, { NodePath } from '@babel/traverse';
import generator from '@babel/generator';
import * as t from '@babel/types';
import { AssetImportType, Assets, createAsset } from '../modules/asset';
import { getAssetsLoaderPlaceholder, handleSourceCode } from '../core';

import { Handler, HandlerRunner } from '../handler-runner';

export class JavascriptHandler<T> implements Handler<T> {
  static HANDLER_NAME = 'JavascriptHandler';

  apply(runner: HandlerRunner<T>): void {
    const { loaderContext, resolver } = runner;
    const { context } = loaderContext;

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
    runner.hooks.afterHandleAssets.tap(JavascriptHandler.HANDLER_NAME, (code) => code);
  }

  private handleImportOrRequireFunctionCall(assets: Assets[], nodePath: NodePath<t.CallExpression>) {
    const { node } = nodePath;

    if (!t.isImport(node.callee)) {
      return;
    }

    nodePath.traverse({
      StringLiteral: (sPath) => {
        console.info('skr: import StringLiteral', sPath.node);
      },
      BinaryExpression: (bPath) => {
        console.info('skr: import BinaryExpression', bPath.node);
      },
    });

    console.info('skr: import()', { node, source: nodePath.getSource() });
  }

  private createAssetFromStringLiteral(assets: Assets[], type: AssetImportType, nodePath: NodePath<t.StringLiteral>) {
    const stringLiteralNode = nodePath.node;

    if (!/\.\w+$/.test(stringLiteralNode.value)) {
      return;
    }

    const asset = createAsset(type, {
      code: stringLiteralNode.value,
      request: stringLiteralNode.value,
    });

    const placeholder = getAssetsLoaderPlaceholder(assets.length);
    /** 修改其内容为占位符 */
    stringLiteralNode.value = placeholder;
    assets.push(asset);

    /** 下面这种写法会导致套娃，原因未知 */
    // const placeholderNode = t.stringLiteral(getAssetsLoaderPlaceholder(asset.length));
    // stringLiteralPath.replaceWith(placeholderNode);
  }
}
