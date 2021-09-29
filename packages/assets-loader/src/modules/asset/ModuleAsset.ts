import $ from 'lodash';
import { BaseAsset, BaseAssetOptions } from './BaseAsset';
import { AssetImportType } from './type';

export class ModuleAsset extends BaseAsset {
  constructor(options: Omit<BaseAssetOptions, 'type'>) {
    super($.assign(options, { type: AssetImportType.Module }));
  }
}
