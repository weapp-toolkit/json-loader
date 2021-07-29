import { IWeappAppConfig, IWeappComponentConfig, IWeappPageConfig } from '@weapp-toolkit/weapp-types';

export type IWeappConfigJSON = IWeappAppConfig | IWeappPageConfig | IWeappComponentConfig;

/**
 * 微信小程序 JSON 配置文件类型
 */
export type WeappConfigType = 'app' | 'component' | 'page';
