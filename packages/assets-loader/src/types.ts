/** 资源引入类型 */
export enum AssetImportType {
  /** 普通引入 */
  Normal,
  /** 模块化引入 */
  Module,
  /** 带变量的引入 */
  Glob,
  /** 网络资源引入 */
  Http,
  /** 未知 */
  Unknown,
}

interface IBaseAssets {
  /** 源码 */
  code: string;
  /** 资源路径 */
  request: string;
}

export interface ModuleAssets extends IBaseAssets {
  type: AssetImportType.Module;
}

export interface NormalAssets extends IBaseAssets {
  type: AssetImportType.Normal;
}

export interface GlobAssets extends IBaseAssets {
  type: AssetImportType.Glob;
  /** glob 路径 */
  glob: string;
  request: string;
}

export interface HttpAssets extends IBaseAssets {
  type: AssetImportType.Http;
  /** http 资源路径 */
  request: string;
}

export interface UnknownAssets extends IBaseAssets {
  type: AssetImportType.Unknown;
}

export type Assets = ModuleAssets | NormalAssets | GlobAssets | HttpAssets | UnknownAssets;
