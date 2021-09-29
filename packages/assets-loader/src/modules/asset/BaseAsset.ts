import { AssetImportType } from './type';

export interface BaseAssetOptions {
  /** 源码 */
  code: string;
  /** 资源路径 */
  request: string;
  /** 资源类型 */
  type: AssetImportType;
}

export class BaseAsset {
  /** 源码 */
  public code: string;

  /** 资源路径 */
  public request: string;

  /** 资源类型 */
  public type: AssetImportType;

  constructor(options: BaseAssetOptions) {
    const { code, request, type } = options;

    this.code = code;
    this.request = request;
    this.type = type;
  }
}
