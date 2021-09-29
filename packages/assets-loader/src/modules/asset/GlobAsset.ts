import $ from 'lodash';
import { BaseAsset, BaseAssetOptions } from './BaseAsset';
import { AssetImportType } from './type';
import { TEMPLATE_STRING_MATCHER, EXPRESSION_MATCHER } from '../../core';

export class GlobAsset extends BaseAsset {
  private globExpression?: string;

  constructor(options: Omit<BaseAssetOptions, 'type'>) {
    super($.assign(options, { type: AssetImportType.Glob }));
  }

  /** 获取 glob 表达式 */
  public getGlobExpression(): string {
    if (!this.globExpression) {
      this.globExpression = this.request.replace(TEMPLATE_STRING_MATCHER, '*').replace(EXPRESSION_MATCHER, '*');
    }

    return this.globExpression;
  }
}
