import vm from 'vm';
import path from 'path';
import { replaceExt, shortid } from '@weapp-toolkit/core';
import { LoaderContext } from 'webpack';
import * as babel from '@babel/core';
import { CustomAssetInfo } from '@weapp-toolkit/weapp-types';
import { HandlerRunner, HooksParameter } from './handler-runner';
import { HTTP_MATCHER } from './core';

/**
 * 使用虚拟机执行代码
 * @param code
 * @param filename
 */
function evalCode(code: string, filename?: string) {
  const transformedCode = babel.transform(code, {
    babelrc: false,
    presets: [
      [
        require('@babel/preset-env'),
        {
          modules: 'commonjs',
          targets: { node: 'current' },
        },
      ],
    ],
    // plugins: [require('babel-plugin-add-module-exports')],
  })?.code;

  if (!transformedCode) {
    throw new Error('代码转换失败');
  }

  const script = new vm.Script(transformedCode, {
    filename,
    displayErrors: true,
  });

  return script.runInNewContext({
    module: {
      exports: {},
    },
    exports: {},
    __webpack_public_path__: '',
    import: () => {
      throw new Error('此文件不支持解析 import');
    },
    require: () => {
      throw new Error('此文件不支持解析 require');
    },
  });
}

/**
 * 使用 loader 加载模块并注入父节点信息，返回加载结果
 * @param loaderContext
 * @param request
 * @returns
 */
export async function loadModule<T>(loaderContext: LoaderContext<T>, request: string): Promise<string | void> {
  return new Promise<string | void>((resolve, reject) => {
    /** 手动加载静态资源的依赖 */
    loaderContext.loadModule(request, (e, code, _, module) => {
      if (e) {
        console.error('[assets-loader]', e);
        reject(e);
      }

      loaderContext.addDependency(request);

      if (!module) {
        console.info('[assets-loader] module is undefined');
        resolve();
        return;
      }

      if (!module.buildInfo.parentsPath) {
        module.buildInfo.parentsPath = new Set<string>();
      }

      /** 解析模块化的资源 */
      if (/export/.test(code)) {
        resolve(evalCode(code, request));
      }

      /** 记录父节点信息 */
      module.buildInfo.parentsPath.add(loaderContext.resourcePath);
      resolve();
    });
  });
}

export async function handleAsset<T>(
  identify: string,
  runner: HandlerRunner<T>,
  parameter: HooksParameter,
): Promise<string> {
  const { loaderContext, resolver, placeholderMap } = runner;
  const { context } = loaderContext;
  const { asset, end } = parameter;

  /** 依赖的绝对路径 */
  const request = await resolver.resolveDependency(context, asset.request);

  const placeholder = `___${identify}_${shortid()}___`;
  // const dependency = `
  //   var ${placeholder} = require('${request}');
  // `;

  // return dependency + end(`"\` + ${placeholder} + \`"`);

  const resource = await loadModule(loaderContext, request);

  /**
   * @thinking
   * 如果使用 file-loader 输出图片，并且图片被独立分包引用了，该怎么处理？
   * - 地址可能是相对地址
   * - 地址可能是网络地址
   * 只有网络地址不需要处理，是不是只将网络地址回填就行了呢？
   * 相对地址则走标准依赖分析流程？
   */

  /** 如果返回了资源，并且是网络地址 */
  if (resource && HTTP_MATCHER.test(resource)) {
    /** 直接写入，不需要依赖分析 */
    return end(`"${resource}"`);
  }

  /** 记录占位符和资源的映射 */
  placeholderMap.set(placeholder, {
    reference: request,
  });

  /** 返回替换后的代码 */
  return end(`"${placeholder}"`);
}

/**
 * 生成文件
 * @param runner
 * @param code
 * @param extname 后缀名，可缺省。例：`.wxss`
 * @returns
 */
export function handleEmit<T>(runner: HandlerRunner<T>, code: string, extname?: string): string {
  const { appRoot, loaderContext } = runner;
  const { resourcePath } = loaderContext;

  let filename = path.relative(appRoot, resourcePath);
  filename = extname ? replaceExt(filename, extname) : filename;

  /** 生成文件 */
  loaderContext.emitFile(filename, code, undefined, {
    placeholderMap: runner.placeholderMap,
    extname,
  } as CustomAssetInfo);

  return '';
}
