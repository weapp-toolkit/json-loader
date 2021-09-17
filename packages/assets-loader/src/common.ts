import path from 'path';
import { replaceExt, shortid } from '@weapp-toolkit/core';
import { HandlerRunner, HooksParameter } from './handler-runner';

export async function handleAsset<T>(
  identify: string,
  runner: HandlerRunner<T>,
  parameter: HooksParameter,
): Promise<string> {
  const { loaderContext, resolve, placeholderMap } = runner;
  const { context } = loaderContext;
  const { asset, end } = parameter;

  /** 依赖的绝对路径 */
  const request = await resolve.resolveDependency(context, asset.request);

  const placeholder = `___${identify}_${shortid()}___`;
  // const dependency = `
  //   var ${placeholder} = require('${request}');
  // `;

  // return dependency + end(`"\` + ${placeholder} + \`"`);

  await new Promise<void>((res, rej) => {
    /** 手动加载静态资源的依赖 */
    loaderContext.loadModule(request, (e, code, _, module) => {
      if (e) {
        rej(e);
      }

      if (!module) {
        res();
        return;
      }

      if (!module.buildInfo.parentsPath) {
        module.buildInfo.parentsPath = new Set<string>();
      }

      /** 记录父节点信息 */
      module.buildInfo.parentsPath.add(loaderContext.resourcePath);
      res();
    });
  });

  /** 记录占位符和资源的映射 */
  placeholderMap.set(placeholder, request);

  /** 返回替换后的代码 */
  return end(`"${placeholder}"`);
}

/**
 * 生成文件
 * @param runner
 * @param code
 * @param ext 后缀名，可缺省。例：`.wxss`
 * @returns
 */
export function handleEmit<T>(runner: HandlerRunner<T>, code: string, ext?: string): string {
  const { appRoot, loaderContext } = runner;
  const { resourcePath } = loaderContext;

  let filename = path.relative(appRoot, resourcePath);
  filename = ext ? replaceExt(filename, ext) : filename;

  /** 生成文件 */
  loaderContext.emitFile(filename, code, undefined, {
    placeholderMap: runner.placeholderMap,
  });

  return '';
}
