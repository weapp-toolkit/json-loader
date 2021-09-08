import semver from 'semver';
import chalk from 'chalk';
import path from 'path';

import BaseGenerator from './base-generator.class';
import spinner from '../utils/spinner';
import { isEmptyDir, relative } from '../utils/helper';

import { ImpConfig, ImpContext } from '../@types/config';
import addPage from './add-page';

interface PropsType {
  name?: string;
}

interface StateType {
  type: string;
  componentLib: boolean;
  language: string;
  pathname: string;
  privateKeyPath: boolean | string; // 这里只能做引导
  description: string;
  srcRoot: string;
  output: string;
  projectName: string;
  appId: string;
  baseDir: string;
  cssPreprocessor: ImpConfig['cssPreprocessor'];
}

const EMPTY_CHECK_IGNORES = ['.git'];

class CreateGenerator extends BaseGenerator<PropsType & Partial<StateType>> {
  ctx!: ImpContext;

  cwd: string;

  constructor(ctx: ImpContext, props: PropsType) {
    super(ctx, props);
    this.ctx = ctx;
    this.cwd = process.cwd();
  }

  initializing() {
    const { props } = this;
    let pathname = path.resolve(this.ctx.mpRoot, props.name || '');
    let name = '';

    if (props.name) {
      name = path.basename(pathname);
      pathname = pathname.replace(new RegExp(`${name}$`), '');
    }

    if (!isEmptyDir(path.join(pathname, name), EMPTY_CHECK_IGNORES)) {
      console.error('目标文件夹不为空！');
      process.exit(-1);
    }

    Object.assign(this.props, {
      type: '',
      language: '',
      cssPreprocessor: '',
      pathname,
      name: props.name ? name : '',
      srcRoot: 'src',
      output: 'dist',
      baseDir: '.',
    });
  }

  async prompting() {
    await this.promptIfNotSet({
      name: 'name',
      message: '输入项目名（英文）',
      type: 'input',
      validate: (input: string) => {
        if (!input) {
          return '请输入项目名';
        }
        if (!/^[a-z][a-z\d-]*$/.test(input)) {
          return '项目名格式错误（仅支持以英文小写字母开头、由英文小写字母、数字或中划线的组合）';
        }
        if (!isEmptyDir(path.join(this.props.pathname!, input), EMPTY_CHECK_IGNORES)) {
          return '该名称对应的文件夹已存在且不为空';
        }
        return true;
      },
    });

    await this.promptIfNotSet({
      name: 'projectName',
      message: '设置项目名称（中文）',
      type: 'input',
      validate: (input: string) => {
        if (!input) {
          return '请输入项目名称';
        }
        if (!/(\p{Unified_Ideograph}|\w|\d)+/u.test(input)) {
          return '项目名称格式错误';
        }
        return true;
      },
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
        // {
        //   name: 'kbone',
        //   value: 'kbone',
        // },
      ],
      validate(input: string) {
        if (input === 'kbone') {
          return '暂时还不支持 kbone 哦';
        }
        return true;
      },
    });

    await this.promptIfNotSet({
      name: 'componentLib',
      message: '是否组件库开发模式',
      type: 'confirm',
      default: false,
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
      name: 'appId',
      message: '输入 APPID（回车跳过）',
      type: 'input',
      validate: (input: string) => {
        if (input && !/^wx(?=.*\d)(?=.*[a-z])[\da-z]{16}$/.test(input)) {
          return 'APPID 格式错误（请阅读官方文档）';
        }
        return true;
      },
    });

    await this.promptIfNotSet({
      name: 'privateKeyPath',
      message: `请从小程序后台下载 private.${this.props.appId || 'xxx'}.key 文件放入项目根目录（用于上传）`,
      type: 'list',
      choices: [
        {
          name: '我已知晓',
          value: true,
        },
      ],
    });
  }

  configuring() {
    const { type, language, pathname, name, cssPreprocessor, appId } = this.props;
    this.destinationRoot(path.join(pathname!, name!));
    this.ctx.mpRoot = this.destinationPath();
    this.ctx.srcRoot = this.destinationPath('src');

    this.props.privateKeyPath = `private.${appId}.key`;
    // 下面调用创建 page 命令时需要使用
    this.ctx.config.type = type;
    this.ctx.config.language = language;
    this.ctx.config.cssPreprocessor = cssPreprocessor || 'postcss';
  }

  writing() {
    const { type, language, componentLib } = this.props;
    this.copyFiles(
      [
        ['common', '.'],
        [`${type}-${language}/src`, 'src'],
      ],
      {
        ignores: componentLib ? [] : ['common/config'],
      },
    );
  }

  async install() {
    const { npm } = this.ctx;
    const { componentLib, language, cssPreprocessor } = this.props;
    await addPage(this.ctx, {
      name: 'index',
      pathname: 'pages',
    });

    console.log('\n');
    spinner.info('开始安装依赖\n');

    await npm(['install'], { cwd: this.ctx.mpRoot });

    const modules = [
      '@tencent/imweb-miniprogram-cli',
      'gulp',
      'babel-loader',
      '@babel/plugin-proposal-class-properties',
    ];
    switch (cssPreprocessor) {
      case 'sass':
        this.renameFiles([
          ['src/app.css', 'src/app.scss'],
          ['src/assets/css/reset.css', 'src/assets/css/reset.scss'],
          ['src/assets/css/vars.css', 'src/assets/css/vars.scss'],
        ]);
        break;
      case 'less':
        this.renameFiles([
          ['src/app.css', 'src/app.less'],
          ['src/assets/css/reset.css', 'src/assets/css/reset.less'],
          ['src/assets/css/vars.css', 'src/assets/css/vars.less'],
        ]);
        break;
      default:
        break;
    }

    if (language === 'ts') {
      modules.push(
        'typescript',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        '@babel/preset-typescript',
      );
    }

    if (componentLib) {
      modules.push('jest');
    }

    await npm(['install', '--save-dev'].concat(modules), {
      cwd: this.ctx.mpRoot,
    });
  }

  end() {
    console.log('\n');
    spinner.info('可在 imp.config.js 修改配置.');
    spinner.info(`Start your project:\n      cd ${relative(this.cwd, this.ctx.mpRoot)} && npm run dev\n`);
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
