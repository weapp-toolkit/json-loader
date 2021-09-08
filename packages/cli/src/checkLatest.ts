import path from 'path';
import semver from 'semver';
import { PackageJsonType } from './@types/common';
import { ImpContext } from './@types/config';
import { getDateTimeString, writeJsonFile } from './utils/helper';

const todayStr = getDateTimeString(new Date(), 'date');
const DEBUG = false;

interface CheckResult {
  currentVersion: string;
  latestVersion: string;
}

const getLatestVersion = async (ctx: ImpContext) => {
  // END 检查是否需要检查更新
  const { npm } = ctx;
  let result: string;

  try {
    result = await npm(['info', '@tencent/imweb-miniprogram-cli', 'version'], {
      stdio: [],
    });
  } catch (error) {
    return '';
  }

  return result.toString().trim();
};

export default async (ctx: ImpContext): Promise<CheckResult | undefined> => {
  // START 检查是否需要检查更新
  const { customConfig, customConfigPath } = ctx;
  const packageJson: PackageJsonType = require(path.resolve(__dirname, '../package.json'));
  const currentVersion = packageJson.version;

  // 最近一次拉取最新版本号的日期是今天
  if (customConfig.updateDate === todayStr) {
    const { latestVersion } = customConfig;
    // 需要升级 并且 本地有保存最新版本号
    if (latestVersion && semver.neq(latestVersion, currentVersion)) {
      return {
        currentVersion,
        latestVersion,
      };
    }
    return;
  }

  const latestVersion = (await getLatestVersion(ctx)) || currentVersion;
  const needUpdate = semver.neq(latestVersion, currentVersion);

  customConfig.updateDate = todayStr;
  customConfig.latestVersion = latestVersion;

  // 写回配置
  writeJsonFile(customConfigPath, customConfig);

  if (needUpdate || DEBUG) {
    return {
      currentVersion,
      latestVersion,
    };
  }
};
