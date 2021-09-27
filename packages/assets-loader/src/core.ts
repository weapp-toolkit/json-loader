import { Assets, AssetImportType } from './types';

interface IHandleSourceCodeResult {
  assets: Assets[];
  code: string;
}

/** 粗略匹配资源 */
export const ROUGHLY_MATCHER = /((import|require)([^\w]*?)[^'"`=:]*?)?['"`][^:;<>]*?\.[a-zA-Z]+['"`]/gm;
// export const COMMENT_MATCHER = /(\/\*[\w'\s\r\n*]*\*\/)|(\/\/[\w\s']*)|(<!--[\s\w>/]*-->)/gm;
/** 匹配模板字符串拼接资源 */
export const TEMPLATE_STRING_MATCHER = /(?<=[^${}'"`]+)[${]\{(.*)?\}\}?/g;
/** 匹配表达式拼接资源 */
export const EXPRESSION_MATCHER = /(?<=[^${}'"`]+)['"`](.*?)['"`]/g;
/** 匹配模块化引入的资源 */
export const MODULE_MATCHER = /^\s?(import|require)(\b|[^\w])/;
/** 匹配 http 资源 */
export const HTTP_MATCHER = /^(https?|\/\/).+\.\w+$/;
/** 匹配纯文本资源 */
export const NORMAL_MATCHER = /^[^{}'"`]+\.\w+$/;
/** 匹配非纯文本资源 */
export const GLOB_MATCHER = /[${}+'"`]+(.*)?\.\w+$/;

export const getAssetsLoaderPlaceholder = (index: number): string => `___ASSETS_LOADER_PLACEHOLDER_${index}___`;

/**
 * 从字符串解析资源
 * @param code
 */
const handleAssets = (code: string): Assets => {
  code = code.replace(/\s\r\t\n/g, '');
  const request = code.replace(/^['"`]/, '').replace(/['"`]$/, '');

  if (HTTP_MATCHER.test(request)) {
    return {
      type: AssetImportType.Http,
      request,
      code,
    };
  }

  if (MODULE_MATCHER.test(request)) {
    return {
      type: AssetImportType.Module,
      request: code.match(/(?<=['"`])(.*?)(?=['"`])/)![0],
      code: code.match(/['"`](.*?)['"`]/)![0],
    };
  }

  if (NORMAL_MATCHER.test(request)) {
    return {
      type: AssetImportType.Normal,
      request,
      code,
    };
  }

  if (GLOB_MATCHER.test(request)) {
    let handledRequest = request;
    handledRequest = handledRequest.replace(TEMPLATE_STRING_MATCHER, '*');
    handledRequest = handledRequest.replace(EXPRESSION_MATCHER, '*');

    return {
      type: AssetImportType.Glob,
      glob: handledRequest,
      request,
      code,
    };
  }

  return {
    type: AssetImportType.Unknown,
    request,
    code,
  };
};

/**
 * 处理源码并获取资源
 * @param sourceCode 源码
 * @returns
 */
export const handleSourceCode = (sourceCode: string): IHandleSourceCodeResult => {
  const assets: Assets[] = [];
  const code = sourceCode.replace(ROUGHLY_MATCHER, (match) => {
    const asset = handleAssets(match);
    assets.push(asset);

    /** 将资源缓存，并替换为占位字符串，后续替换代码使用 */
    return match.replace(asset.code, getAssetsLoaderPlaceholder(assets.length - 1));
  });

  return { assets, code };
};

/**
 * 替换掉代码中的占位符
 */
export function replacePlaceholder(index: number, code: string, replacer: string): string {
  const regex = new RegExp(getAssetsLoaderPlaceholder(index));
  return code.replace(regex, replacer);
}
