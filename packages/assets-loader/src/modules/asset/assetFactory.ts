import { BaseAssetOptions } from './BaseAsset';
import { GlobAsset } from './GlobAsset';
import { HttpAsset } from './HttpAsset';
import { ModuleAsset } from './ModuleAsset';
import { NormalAsset } from './NormalAsset';
import { AssetImportType, Assets } from './type';
import { UnknownAsset } from './UnknownAsset';

export function createAsset(type: AssetImportType, options: Omit<BaseAssetOptions, 'type'>): Assets {
  switch (type) {
    case AssetImportType.Module:
      return new ModuleAsset(options);
    case AssetImportType.Normal:
      return new NormalAsset(options);
    case AssetImportType.Http:
      return new HttpAsset(options);
    case AssetImportType.Glob:
      return new GlobAsset(options);
    default:
      return new UnknownAsset(options);
  }
}
