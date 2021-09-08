import fsx from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import Generator, { Question } from 'yeoman-generator';
import { getDateTimeString, writeJsonFile } from '../utils/helper';

import { BaseGeneratorProps } from '../@types/common';
import { ImpContext } from '../@types/config';
import { ValueType } from '../@types/tools';
import { CopyOptions } from '../@types/libs/base-generator';

type PromptOption<PropsTypes, AnswerKey extends string | number | symbol, AnswerValue> = Question<
  Record<AnswerKey, AnswerValue>
> & {
  name: keyof PropsTypes;
  outputName?: keyof PropsTypes;
  choices?: Array<{
    name: string;
    value: AnswerValue extends Array<string> ? string : AnswerValue;
  }>;
  // validate?: (inputValue: AnswerValue) => string | boolean;
};

export default class BaseGenerator<PropsType extends { [k: string]: any }> extends Generator {
  props: PropsType & BaseGeneratorProps;

  constructor(ctx: ImpContext, props: PropsType) {
    super([], props);
    let gitName = '';
    let gitEmail = '';

    try {
      gitName = this.user.git.name() || '';
      gitEmail = this.user.git.email() || '';
    } catch (e) {}

    this.props = {
      type: ctx.config.type,
      dateTime: getDateTimeString(new Date(), 'time'),
      gitName,
      gitEmail,
      typeInline: ctx.config.typeInline,
      ...props,
      language: props.language || ctx.config.language,
    };

    this.sourceRoot(path.join(__dirname, '../../templates/')); // 指定模板目录
    this.destinationRoot(ctx.srcRoot);
  }

  async promptIfNotSet<AnswerKey extends keyof (PropsType & BaseGeneratorProps)>(
    option: PromptOption<
      PropsType & BaseGeneratorProps,
      AnswerKey,
      ValueType<PropsType & BaseGeneratorProps, AnswerKey>
    >,
  ): Promise<void> {
    const { name, outputName, validate, choices } = option;
    const inputValue = this.props[name];
    const propsKey = (outputName || name) as AnswerKey;

    // 如果有输入，先校验格式正确
    if (inputValue) {
      const validateResult = validate ? validate(inputValue) : true;
      const valid = validateResult === true;
      // 如果是选项型，需要校验是否合法
      if (choices) {
        // 预设值可能是 name 也可能是 value
        const selection = choices.find((c) => c.name === inputValue || c.value === inputValue);
        // 选项合法
        if (selection && valid) {
          this.props[propsKey] = selection.value;
          return;
        }
      }
      if (valid) {
        return;
      }
      console.log(chalk.red(typeof validateResult === 'string' ? validateResult : `Invalid ${name}: ${inputValue}`));
    }

    const value = await this.prompt(option);
    this.props[propsKey] = value[name as AnswerKey];
  }

  async promptLanguageIfNotSet(): Promise<void> {
    if (['js', 'ts'].indexOf(this.props.language) > -1) {
      return;
    }

    const { language } = await this.prompt({
      name: 'language',
      message: '请选择语言',
      type: 'list',
      default: 'ts',
      choices: [
        {
          name: 'Typescript',
          value: 'ts',
        },
        {
          name: 'Javascript',
          value: 'js',
        },
      ],
    });
    this.props.language = language;
  }

  _renameFiles(files: string[] = []): void {
    try {
      files.forEach((name) => {
        const nameArr = name.split('.');
        const ext = nameArr.length === 1 ? '' : `.${nameArr.splice(-1)}`;
        const filename = nameArr.join('');
        const newFilename = `${filename}.old${ext}`;
        if (fsx.existsSync(this.destinationPath(newFilename))) {
          return;
        }
        fsx.renameSync(this.destinationPath(name), this.destinationPath(newFilename));
      });
    } catch (error) {}
  }

  _removeFiles(files: string[] = []): void {
    files.forEach((src) => {
      fsx.removeSync(this.destinationPath(src));
    });
  }

  public copyFiles(files: Array<[string, string]> = [], option: CopyOptions = {}): void {
    const { ignores = [] } = option;
    files.forEach(([src, dest]) => {
      const srcPath = this.templatePath(src);
      const destPath = this.destinationPath(dest);

      if (ignores.some((i) => i === src)) {
        return;
      }

      if (fsx.statSync(srcPath).isDirectory()) {
        if (!fsx.existsSync(destPath)) {
          fsx.mkdirSync(destPath);
        }
        const _files = fsx.readdirSync(srcPath);
        this.copyFiles(
          _files.map<[string, string]>((filename) => [path.join(src, filename), path.join(dest, filename)]),
          option,
        );
      } else {
        let _dest = dest;
        const { extname } = option;
        if (extname) {
          // 后缀替换
          extname.some(({ from, to }) => {
            _dest = _dest.replace(new RegExp(`\\.${from}\\b`), `.${to}`);
            // 匹配到了一个就不用再继续匹配了
            return dest !== _dest;
          });
        }

        if (path.extname(src) === '.tpl') {
          this._copyTpls(src, _dest.replace(/\.tpl$/, ''));
          return;
        }
        this._copyFiles(src, _dest);
      }
    });
  }

  private _copyFiles(src: string, dest: string, force?: boolean): void {
    if (!force && fsx.existsSync(this.destinationPath(dest))) {
      return;
    }
    this.fs.copy(this.templatePath(src), this.destinationPath(dest));
  }

  private _copyTpls(src: string, dest: string): void {
    this.fs.copyTpl(
      this.templatePath(src),
      this.destinationPath(dest),
      this.props, // 参数列表
    );
  }

  public renameFiles(files: Array<[string, string]> = []): void {
    files.forEach(([from, to]) => {
      const fromPath = this.destinationPath(from);
      const toPath = this.destinationPath(to);
      if (fsx.existsSync(fromPath)) {
        fsx.renameSync(fromPath, toPath);
      }
    });
  }

  _generateJson(files: Array<[Record<string, any>, string]> = []): void {
    files.forEach(([o, dest]) => {
      const distPath = this.destinationPath(dest);
      const dirname = path.dirname(distPath);
      if (!fsx.existsSync(dirname)) {
        fsx.mkdirSync(dirname);
      }
      writeJsonFile(distPath, o);
    });
  }
}
