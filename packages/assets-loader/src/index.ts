import path from 'path';
import fs from 'fs';
import globby from 'globby';
import { LoaderContext } from 'webpack';
import { promiseParallel } from '@weapp-toolkit/core';
// import { getOptions } from 'loader-utils';
import { ASSETS_MARKER_PLACEHOLDER, handleSourceCode } from './core';
import { AssetsType } from './types';

/**
 * 微信小程序 js 解析器
 * 解析 js 内部引用的图片等资源
 *
 * @param source
 * @returns
 */
async function assetsLoader(this: LoaderContext<null>, source: string | Buffer): Promise<void> {
  // const options = getOptions(this);
  const callback = this.async();

  // validate(schema, options);

  /** 将 source 转为 string 类型 */
  const sourceString = typeof source === 'string' ? source : source.toString();
  const resolve = this.getResolve();

  console.info('skr: sourceString', sourceString);

  const handleResult = handleSourceCode(sourceString);
  const { assets } = handleResult;
  let { code } = handleResult;

  /** 处理所有识别的资源 */
  for (let index = 0; index < assets.length; index++) {
    const asset = assets[index];
    switch (asset.type) {
      case AssetsType.Http:
      case AssetsType.Unknown:
        code = replacePlaceholder(index, code, asset.code);
        break;
      case AssetsType.Normal: {
        const request = await resolve(this.context, asset.request);
        this.addDependency(request);

        /** 替换为模块化引入方式 */
        code = replacePlaceholder(index, code, `require('${asset.request}')`);
        break;
      }
      case AssetsType.Glob: {
        const requests = globby.sync(asset.request, {
          cwd: this.context,
        });

        await Promise.all(requests.map(async (request) => {
          const resolvedRequest = await resolve(this.context, './' + request);
          this.addDependency(resolvedRequest);
          // this.loadModule(resolvedRequest, () => {});
          /** 无法处理，直接按照相对路径生成 */
          this.emitFile(path.relative(this.context, resolvedRequest), fs.readFileSync(resolvedRequest));
        }));


        // promiseParallel(Array.prototype.forEach, requests, async (request) => {
        //   const resolvedRequest = await resolve(this.context, './' + request);
        //   this.addDependency(resolvedRequest);
        // });

        /** 暂时没法处理 */
        code = replacePlaceholder(index, code, asset.code);
        break;
      }
      default:
        break;
    }
  }

  console.info('skr: code', code);
  /** 返回处理后的字符串 */
  return callback?.(null, code);
}

/**
 * 替换掉代码中的占位符
 */
function replacePlaceholder(index: number, code: string, replacer: string): string {
  const regex = new RegExp(ASSETS_MARKER_PLACEHOLDER + index);
  return code.replace(regex, replacer);
}

export default assetsLoader;
