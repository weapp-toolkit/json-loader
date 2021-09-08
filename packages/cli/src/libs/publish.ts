import semver from 'semver';
import chalk from 'chalk';
import path from 'path';
import * as ci from 'miniprogram-ci';
import BaseGenerator from './base-generator.class';
import { ImpContext } from '../@types/config';
import { getPackageJson } from '../utils/helper';
import { PackageJsonType } from '../@types/common';
import spinner from '../utils/spinner';
import spawn from '../utils/spawn';

interface PropsType {
  version: string;
  description: string;
}

class CreateGenerator extends BaseGenerator<PropsType> {
  ctx: ImpContext;

  packageJson: Partial<PackageJsonType>;

  version!: {
    current: string;
    nextMajor: string;
    nextMinor: string;
    nextPatch: string;
  };

  constructor(ctx: ImpContext, props: PropsType) {
    super(ctx, props);

    this.ctx = ctx;
    this.packageJson = getPackageJson(ctx.mpRoot);
  }

  initializing() {
    const { version = '1.0.0' } = this.packageJson;
    const [major = 1, minor = 0, patch = 0] = version.split('.');
    this.version = {
      current: version,
      nextMajor: `${Number(major) + 1}.0.0`,
      nextMinor: `${major}.${Number(minor) + 1}.0`,
      nextPatch: `${major}.${minor}.${Number(patch) + 1}`,
    };
  }

  async prompting() {
    const { version } = this;

    await this.promptIfNotSet({
      name: 'version',
      message: `请选择版本号（当前版本：${version.current}）`,
      type: 'list',
      choices: [
        {
          name: `${version.nextMajor}（版本升级）`,
          value: version.nextMajor,
        },
        {
          name: `${version.nextMinor}（特性更新）`,
          value: version.nextMinor,
        },
        {
          name: `${version.nextPatch}（问题修复 & 非特性更新）`,
          value: version.nextPatch,
        },
      ],
      default: version.nextPatch,
      validate(input: string) {
        if (!/^\d+\.\d+\.\d+$/.test(input)) {
          return '版本号格式不正确，应由 `[major].[minor].[patch]` 三部分数字组成';
        }
        return true;
      },
    });

    await this.promptIfNotSet({
      name: 'description',
      message: '输入发布描述或备注',
      type: 'input',
      validate: (input: string) => {
        if (!input) {
          return '请输入发布描述或备注';
        }
        return true;
      },
    });
  }

  async configuring() {
    const { ctx } = this;
    const { version, description } = this.props;

    const appid = ctx.config.appId;
    const privateKeyPath = path.resolve(ctx.mpRoot, ctx.config.privateKeyPath);

    if (!appid) {
      spinner.fail('`appId` 不能为空！请检查 imp.comfig.js.');
      process.exit(-1);
    }

    if (!privateKeyPath) {
      spinner.fail('`privateKeyPath` 不存在！请检查项目是否放入 privateKey 或在 imp.comfig.js 正确配置路径.');
      process.exit(-1);
    }

    spinner.logWithSpinner('正在上传代码...');

    const project = new ci.Project({
      appid: ctx.config.appId,
      type: 'miniProgram',
      projectPath: ctx.mpRoot,
      privateKeyPath,
    });

    const result = await ci.upload({
      project,
      version,
      desc: description,
      setting: {
        es6: true,
        es7: true,
        minify: true,
      },
      onProgressUpdate() {},
    });

    console.log(result);
    spinner.succeed('上传完成');

    // modifyJsonFile<PackageJsonType>(path.resolve(ctx.mpRoot, 'package.json'), (o) => {
    //   o.version = version;
    // });
    // eslint-disable-next-line max-len
    // shell.exec(`git tag -a v${version} -m '${description}' && git add . && git commit -m 'chore(release:v${version}): ${description}' && git push --tags origin $(git symbolic-ref --short -q HEAD 2>&1)`);

    await spawn('npx', ['standard-version', '--release-as', version, '--releaseCommitMessageFormat', description], {
      cwd: ctx.mpRoot,
    });
    // shell.exec('git push --tags origin $(git symbolic-ref --short -q HEAD 2>&1)');
  }
}

export default (ctx: ImpContext, props: PropsType): Promise<void> => {
  if (!semver.satisfies(process.version, '>= 10.0.0')) {
    console.error(chalk.red('✘ The generator will only work with Node v10.0.0 and up!'));
    process.exit(1);
  }

  return new Promise((resolve) => {
    new CreateGenerator(ctx, props).run(resolve);
  });
};
