import { ModuleAsset, NormalAsset, GlobAsset, HttpAsset, UnknownAsset } from '.';

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

export type Assets = ModuleAsset | NormalAsset | GlobAsset | HttpAsset | UnknownAsset;
