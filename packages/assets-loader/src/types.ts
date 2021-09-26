/** 资源引入类型 */
export enum AssetImportType {
  Normal /** 普通引入 */,
  Module /** 模块化引入 */,
  Glob /** 带变量的引入 */,
  Http /** 网络资源引入 */,
  Unknown /** 未知 */,
}

interface IBaseAssets {
  code: string /** 源码 */;
  request: string /** 资源路径 */;
}

export interface ModuleAssets extends IBaseAssets {
  type: AssetImportType.Module;
}

export interface NormalAssets extends IBaseAssets {
  type: AssetImportType.Normal;
}

export interface GlobAssets extends IBaseAssets {
  type: AssetImportType.Glob;
  glob: string /** glob 路径 */;
  request: string;
}

export interface HttpAssets extends IBaseAssets {
  type: AssetImportType.Http;
  request: string /** http 资源路径 */;
}

export interface UnknownAssets extends IBaseAssets {
  type: AssetImportType.Unknown;
}

export type Assets = ModuleAssets | NormalAssets | GlobAssets | HttpAssets | UnknownAssets;
