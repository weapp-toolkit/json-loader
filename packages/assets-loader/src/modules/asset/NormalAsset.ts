import $ from 'lodash';
import { BaseAsset, BaseAssetOptions } from './BaseAsset';
import { AssetImportType } from './type';

export class NormalAsset extends BaseAsset {
  constructor(options: Omit<BaseAssetOptions, 'type'>) {
    super($.assign(options, { type: AssetImportType.Normal }));
  }
}
