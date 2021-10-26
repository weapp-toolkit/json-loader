import fsx from 'fs-extra';
import { IWeappAppConfig } from '@weapp-toolkit/weapp-types';
import { Container } from '../DI';

/**
 * 依赖注入容器
 */
export const container = new Container();

/**
 * 检查 App 文件是否存在
 * @param appPath app 绝对路径
 */
export function checkAppFilepath(appPath: string): void {
  if (!fsx.existsSync(appPath)) {
    throw new Error(`找不到 app 文件：${appPath}`);
  }
}

/**
 * 校验 app.json 的合法性
 * @param appJson
 */
export function validateAppJson(appJson: Partial<IWeappAppConfig>): void {
  if (!appJson.pages || appJson.pages.length === 0) {
    throw new Error('非法的 app.json 文件');
  }
}
