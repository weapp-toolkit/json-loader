import semver from 'semver';
import chalk from 'chalk';
import fsx from 'fs-extra';
import path from 'path';

import BaseGenerator from './base-generator.class';
import spinner from '../utils/spinner';
import { getPrivateKeyPath, getProjectConfigJson, modifyJsonFile, setPackageJsonScript } from '../utils/helper';

import { ImpConfig, ImpContext } from '../@types/config';
import { ProjectConfigJsonType } from '../@types/common';
import npmOperator from './npm-operator';

interface StateType {
  type: string;
  componentLib: boolean;
  language: string;
  privateKeyPath: string;
  baseDir: string;
  srcRoot: string;
  cssPreprocessor: ImpConfig['cssPreprocessor'];
  appId: string;
}

class InitGenerator extends BaseGenerator<Partial<StateType>> {
  ctx!: ImpContext;

  projectJson!: Partial<ProjectConfigJsonType>;

  constructor(ctx: ImpContext) {
    super(ctx, {});
    Object.assign(this.props, {
      type: '',
      language: '',
      cssPreprocessor: '',
      baseDir: '',
    });
    this.ctx = ctx;
    this.props.componentLib = false;
    this.destinationRoot(ctx.mpRoot);
  }

  initializing() {}

  async prompting() {
    await this.promptIfNotSet({
      name: 'baseDir',
      message: '指定 baseDir（相对路径）',
      type: 'input',
      default: '.',
      validate: (input: string) => {
        if (!input) {
          return '请输入 baseDir';
        }
        if (/^(\.)?\/?([\w.-]\/?)*$/.test(input)) {
          if (fsx.existsSync(path.resolve(this.ctx.mpRoot, input, 'project.config.json'))) {
            return true;
          }
          return `路径 \`${path.resolve(this.ctx.mpRoot, input)}\` 下不存在 project.config.json`;
        }
        return '路径格式不正确';
      },
    });

    this.destinationRoot(path.resolve(this.ctx.mpRoot, this.props.baseDir!));
    this.projectJson = getProjectConfigJson(this.destinationPath());
    Object.assign(this.props, {
      appId: this.projectJson.appid || '',
      srcRoot: this.projectJson.miniprogramRoot,
      privateKeyPath: getPrivateKeyPath(this.destinationPath(), true),
    });

    await this.promptIfNotSet({
      name: 'type',
      message: '选择项目类型',
      type: 'list',
      choices: [
        {
          name: 'native',
          value: 'native',
        },
        {
          name: 'kbone',
          value: 'kbone',
        },
        {
          name: 'native + kbone',
          value: 'native_kbone',
        },
      ],
      validate(input: string) {
        if (input === 'kbone') {
          return '暂时还不支持 kbone 哦';
        }
        return true;
      },
    });

    await this.promptLanguageIfNotSet();

    await this.promptIfNotSet({
      name: 'cssPreprocessor',
      message: '选择 css 预处理器',
      type: 'list',
      choices: [
        {
          name: 'postcss',
          value: 'postcss',
        },
        {
          name: 'sass',
          value: 'sass',
        },
        {
          name: 'less',
          value: 'less',
        },
      ],
    });

    await this.promptIfNotSet({
      name: 'privateKeyPath',
      message: '输入 private key 相对路径（用于上传，回车跳过）',
      type: 'input',
      validate: (input: string) => {
        if (!input) {
          return true;
        }
        if (/^private\.[a-zA-Z0-9]+\.key$/.test(input)) {
          if (fsx.existsSync(path.resolve(this.ctx.mpRoot, this.props.baseDir || '', input))) {
            return true;
          }
          return 'private key 不存在';
        }
        return 'private key 路径格式不正确';
      },
    });
  }

  configuring() {
    const {
      config: { output },
    } = this.ctx;
    spinner.logWithSpinner('配置 project.config.json\n');

    modifyJsonFile<ProjectConfigJsonType>(this.destinationPath('project.config.json'), (o) => {
      o.miniprogramRoot = output;
    });

    // 修改 package.json script
    setPackageJsonScript(this.destinationPath());
    spinner.succeed('配置完成');
  }

  writing() {
    const { type, language, srcRoot } = this.props;
    // 复制文件并重命名已存在文件
    const renameOld = (p: string) => {
      if (fsx.existsSync(p)) {
        if (fsx.existsSync(`${p}.old`)) {
          return;
        }
        fsx.renameSync(p, `${p}.old`);
        console.log(chalk.yellow(`检测到文件 \`${p}\` 存在，已自动重命名为 \`${p}.old\``));
      }
    };
    renameOld(this.destinationPath('gulpfile.js'));

    this.copyFiles([
      ['common/imp.config.js.tpl', 'imp.config.js'],
      ['common/gulpfile.js', 'gulpfile.js'],
      ['common/postcss.config.js', 'postcss.config.js'],
    ]);

    if (language === 'ts') {
      this.copyFiles([
        [`${type}-${language}/src/typings`, `${srcRoot}/typings`],
        ['common/tsconfig.json.tpl', 'tsconfig.json'],
      ]);
    }

    fsx.appendFile(path.resolve(this.ctx.mpRoot, '.gitignore'), '\ndist', (err) => {
      if (err) {
        console.error('写入 .gitignore 失败，请自行添加 `dist`');
      }
    });
  }

  async install() {
    const { npm } = this.ctx;
    const { language } = this.props;
    console.log('\n');
    spinner.info('开始安装依赖\n');

    const modules = [
      '@tencent/imweb-miniprogram-cli',
      'gulp',
      'fs-extra',
      'babel-loader',
      '@babel/plugin-proposal-class-properties',
      'postcss',
      'postcss-partial-import',
      'postcss-font-base64',
      'postcss-advanced-variables',
      'postcss-nested',
      'postcss-custom-properties',
      'postcss-color-function',
      'postcss-css-variables',
      'postcss-url',
      'postcss-discard-comments',
    ];

    if (language === 'ts') {
      modules.push(
        'typescript',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        '@babel/preset-typescript',
      );
    }
    await npm(['install', '--save-dev'].concat(modules), {
      cwd: this.ctx.mpRoot,
    });

    await npmOperator(this.ctx, {
      operator: 'install',
      modules: [],
    });
  }

  end() {
    console.log('\n');
    spinner.info('可在 imp.config.js 修改配置');
    spinner.info('Start your project:\n      npm run dev\n');
  }
}

export default (ctx: ImpContext): Promise<void> => {
  if (!semver.satisfies(process.version, '>= 10.0.0')) {
    console.error(chalk.red('✘ The generator will only work with Node v10.0.0 and up!'));
    process.exit(1);
  }

  return new Promise((resolve) => {
    new InitGenerator(ctx).run(resolve);
  });
};
