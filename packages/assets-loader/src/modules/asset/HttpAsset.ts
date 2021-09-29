import $ from 'lodash';
import { BaseAsset, BaseAssetOptions } from './BaseAsset';
import { AssetImportType } from './type';

export class HttpAsset extends BaseAsset {
  constructor(options: Omit<BaseAssetOptions, 'type'>) {
    super($.assign(options, { type: AssetImportType.Http }));
  }
}
