const path = require('path');
const fsx = require('fs-extra');
const prompts = require('prompts');
const spawn = require('cross-spawn');

const getPackageJson = () => {
  try {
    return fsx.readJSONSync(path.resolve('.', 'package.json'));
  } catch (error) {
    return {};
  }
};

const getGitName = () => {
  return new Promise((resolve) => {
    try {
      spawn('git', ['config', 'user.name']).stdout.on('data', (d) => {
        resolve(String(d).trim());
      });
    } catch (e) {
      resolve();
    }
  });
};

(async () => {
  const { version: currentVersion = '1.0.0' } = getPackageJson();
  const [major = 1, minor = 0, patch = 0] = currentVersion.split('.');
  /* 候选 version */
  const versionMap = {
    current: currentVersion,
    nextMajor: `${Number(major) + 1}.0.0`,
    nextMinor: `${major}.${Number(minor) + 1}.0`,
    nextPatch: `${major}.${minor}.${Number(patch) + 1}`,
  };

  const gitName = await getGitName();

  await prompts({
    name: 'version',
    message: '请确认构建结果是否为最新并且测试通过',
    type: 'select',
    choices: [
      {
        title: `我已确认，若发生外网问题，我（${gitName}）将负主要责任`,
        value: true,
      },
    ],
  });

  const { version } = await prompts({
    name: 'version',
    message: `请选择版本号（当前版本：${versionMap.current}）`,
    type: 'select',
    choices: [
      {
        title: `${versionMap.nextMajor}（版本升级）`,
        value: versionMap.nextMajor,
      },
      {
        title: `${versionMap.nextMinor}（特性更新）`,
        value: versionMap.nextMinor,
      },
      {
        title: `${versionMap.nextPatch}（问题修复 & 非特性更新）`,
        value: versionMap.nextPatch,
      },
    ],
    initial: 2,
    validate(input) {
      if (!/^\d+\.\d+\.\d+$/.test(input)) {
        return '版本号格式不正确，应由 `[major].[minor].[patch]` 三部分数字组成';
      }
      return true;
    },
  });

  const { description } = await prompts({
    name: 'description',
    message: '输入发布描述或备注',
    type: 'text',
    validate: (input) => {
      if (!input) {
        return '请输入发布描述或备注';
      }
      return true;
    },
  });

  await spawn('npx', ['standard-version', '--release-as', version, '--releaseCommitMessageFormat', description], {
    stdio: [0, 1, 2],
  });
})();
