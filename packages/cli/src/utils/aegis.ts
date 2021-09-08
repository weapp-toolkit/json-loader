import Aegis from '@tencent/aegis-node-sdk';
import { getGitRepoUrl, getPackageJson } from './helper';

const { name = 'unknown' } = getPackageJson(process.cwd());
const { version } = require('../../package.json');

/* 冷启动标记变量 */
let cold = true;

const gitRepoUrl = getGitRepoUrl();
const uin = gitRepoUrl || 'unknown';

const aegis = new Aegis({
  id: 'iujDLhfrTQuSPvNDAi', // 项目ID
  uin, // 用户唯一 ID（可选）
  version,
  delay: 100,
  selector: {
    type: 'host',
  },
});

export const reportPv = (flag: string) => {
  aegis.reportEvent(`[pv] ${flag}`);
};

export const reportCount = (flag: string) => {
  const key = process.env.NODE_ENV ? `[count:${process.env.NODE_ENV}] ${flag}` : `[count] ${flag}`;
  aegis.reportEvent(key);
};

export const reportBuildSpeedStart = (flag: string) => {
  const tag = cold ? 'cold:' : '';

  const key = process.env.NODE_ENV ? `[${tag}${process.env.NODE_ENV}] ${flag}` : flag;
  aegis.time(key);
};

export const reportBuildSpeedStartEnd = (flag: string) => {
  const tag = cold ? 'cold:' : '';

  const key = process.env.NODE_ENV ? `[${tag}${process.env.NODE_ENV}] ${flag}` : flag;
  aegis.timeEnd(key);
};

export const setColdStartOnEnd = () => {
  cold = false;
};

export default aegis;
