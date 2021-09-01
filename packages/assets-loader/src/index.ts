import path from 'path';
import globby from 'globby';
import { LoaderContext } from 'webpack';
import { promiseParallel } from '@weapp-toolkit/core';
// import { getOptions } from 'loader-utils';
import { getAssets } from './core';
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

  console.info('skr: sourceString ', this.resourcePath, sourceString);
  return callback?.(null, sourceString);

  const assets = getAssets(sourceString);
  for await (const asset of assets) {
    switch (asset.type) {
      case AssetsType.Http:
        break;
      case AssetsType.Unknown:
        break;
      case AssetsType.Normal: {
        const request = await resolve(this.context, asset.request);
        this.addDependency(request);
        break;
      }
      case AssetsType.Glob: {
        const requests = globby.sync(asset.request, {
          cwd: this.context,
        });

        await Promise.all(requests.map(async (request) => {
          const resolvedRequest = await resolve(this.context, './' + request);
          this.addDependency(resolvedRequest);
          // this.emitFile(path.relative(this.context), '');
        }));
        // promiseParallel(Array.prototype.forEach, requests, async (request) => {
        //   const resolvedRequest = await resolve(this.context, './' + request);
        //   this.addDependency(resolvedRequest);
        // });

        break;
      }
      default:
        break;
    }
  }

  /** 返回转为字符串后的 JSON */
  return callback?.(null, sourceString);
}

export default assetsLoader;
