import { ImpConfig, ImpContext } from './config';
import { PackageType } from './libs/dependencies';

export interface OptionConfig {
  name?: string;
  alias?: string;
  argument?: string;
  description: string;
  defaultValue?: string | boolean;
  action: (args: string | string[] | boolean, context: ImpContext) => Promise<void>;
}

export interface CommandConfig {
  name?: string;
  alias?: string;
  description: string;
  argument?: string;
  options?: Array<{
    flags: string;
    desc?: string;
    required?: boolean;
    defaultValue?: string | boolean;
  }>;
  action: (argument: string[], option: { [key: string]: any }, context: ImpContext) => void | Promise<void>;
  subCmd?: Array<CommandConfig & { name: string }>;
}

export interface BaseGeneratorProps {
  type: ImpConfig['type'];
  language: ImpConfig['language'];
  dateTime: string;
  gitName: string;
  gitEmail: string;
  typeInline: boolean; // 类型定义是否内联到代码里
}

export interface AppJsonType {
  pages: string[];
  usingComponents?: Record<string, string>;
  subpackages?: PackageType[];
  subPackages?: PackageType[];
  [k: string]: any;
}

export interface ProjectConfigJsonType {
  description: string;
  miniprogramRoot: string;
  projectname: string;
  appid: string;
  [k: string]: any;
}

export interface PackageJsonType {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [k: string]: any;
}
