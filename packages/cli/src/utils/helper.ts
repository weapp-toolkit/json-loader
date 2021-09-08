import fsx from 'fs-extra';
import path from 'path';
import { PackageJsonType, ProjectConfigJsonType } from '../@types/common';
import { ImpConfig } from '../@types/config';
import { PackageAliasType, PackageMapType } from '../@types/libs/dependencies';
import { GetSrcRootOptions } from '../@types/utils/helper';
import { spawnSync } from './spawn';

type O = Record<string, any>;

export const getJsonFile = <T>(filepath: string): Partial<T> => {
  let json: Partial<T> = {};
  try {
    json = fsx.readJSONSync(filepath, { encoding: 'utf-8' });
  } catch (e) {
    // console.warn(chalk.yellow('No such file or directory.'), filepath);
  }
  return json;
};

export const modifyJsonFile = <T extends O>(filepath: string, handler: (o: Partial<T>) => void | Partial<T>): void => {
  let o: Partial<T> = {};
  if (fsx.existsSync(filepath)) {
    try {
      o = fsx.readJSONSync(filepath, {
        encoding: 'utf8',
      });
    } catch (error) {}
  }

  const modifiedO = handler(o) || o;

  writeJsonFile(filepath, modifiedO);
};

export const writeJsonFile = <T extends O>(filepath: string, json: Partial<T>): void => {
  const dirname = path.dirname(filepath);
  if (!fsx.existsSync(dirname)) {
    fsx.mkdirSync(dirname);
  }

  fsx.writeJSONSync(filepath, json, {
    spaces: 2,
  });
};

/**
 * 获取 project.config.json
 * @param mpRoot 小程序根目录
 */
export const getProjectConfigJson = (mpRoot: string): Partial<ProjectConfigJsonType> => {
  const configPath = path.join(mpRoot, 'project.config.json');
  return getJsonFile<ProjectConfigJsonType>(configPath);
};

/**
 * 获取 package.json
 * @param mpRoot 小程序根目录
 */
export const getPackageJson = (mpRoot: string): Partial<PackageJsonType> => {
  const configPath = path.join(mpRoot, 'package.json');
  return getJsonFile<PackageJsonType>(configPath);
};

/**
 * 获取开发目录
 * @param mpRoot
 * @param srcRoot
 * @param options
 */
export const getSrcRoot = (mpRoot: string, srcRoot: string, options?: GetSrcRootOptions): string => {
  const { relative, fallback } = options || {};
  const src = path.resolve(mpRoot, srcRoot);
  // 判断开发目录是否存在
  if (fsx.pathExistsSync(src)) {
    return relative ? srcRoot : src;
  }
  if (fallback) {
    return getSrcRootFromProjectJson(mpRoot, relative);
  }
  console.error(`imp.config.js: \`srcRoot\` 不是有效的路径!\n路径 \`${src}\` 不存在.`);
  process.exit(-1);
};

export const getSrcRootFromProjectJson = (mpRoot: string, relative?: boolean): string => {
  const config = getProjectConfigJson(mpRoot);
  const { miniprogramRoot = '' } = config;
  const src = path.resolve(mpRoot, miniprogramRoot);
  // 判断开发目录是否存在
  if (fsx.pathExistsSync(src)) {
    return relative ? miniprogramRoot.replace(/\/+$/, '') : src;
  }
  return relative ? '' : process.cwd();
  // console.error(`project.config.json: \`miniprogramRoot\` is invalid!\nPath \`${src}\` does not exist.`);
  // process.exit(-1);
};

/**
 * 初始化设置 package.json 的 script 命令
 */
export const setPackageJsonScript = (mpRoot: string): void => {
  const filepath = path.join(mpRoot, 'package.json');

  const backup = (o: Partial<PackageJsonType>, key: string) => {
    o.scripts = o.scripts || {};
    const oldValue = o.scripts[key];
    if (oldValue) {
      o.scripts[`${key}-old`] = oldValue;
    }
  };

  modifyJsonFile<PackageJsonType>(filepath, (o) => {
    o.scripts = o.scripts || {};
    backup(o, 'dev');
    backup(o, 'build');
    backup(o, 'pre-publish');
    backup(o, 'publish');

    o.scripts.dev = 'imp dev';
    o.scripts.build = 'imp build';
    o.scripts['pre-release'] = 'imp i && imp build';
    o.scripts.release = 'imp publish';
  });
};

/**
 * 去掉读取 app.json 中页面路径中的其他部分
 * 如：'pages/my/index' -> 'my'
 *
 * @param {string} packageName
 * @param {string} pagePath
 *
 * @returns {string}
 */
export const getPageName = (packageName: string, pagePath: string): string => {
  const pathArr = pagePath.split('/');
  pathArr.splice(-1);
  if (packageName === 'pages') {
    pathArr.splice(0, 1);
  }
  return pathArr.join('/');
};

/**
 * 通过路径从依赖表获取合法分包名和页面名
 * @param {string} pathname
 * @param {PackageMapType} packageMap
 * @param {PackageAliasType} packageAliasMap
 *
 * @returns {Array}
 */
export const getPackageNameAndPageNameFromPathname = (
  pathname: string,
  packageMap: PackageMapType,
  packageAliasMap: PackageAliasType,
): string[] => {
  if (!pathname) {
    return [];
  }

  const pathArr = pathname.split('/');
  let packageName = pathArr.shift() as string;
  // 如果是别名路径
  if (packageAliasMap[packageName]) {
    const pageName = pathArr.join('/');
    return [packageAliasMap[packageName], pageName];
  }

  do {
    // 如果匹配到包名
    if (packageMap[packageName]) {
      const pageName = pathArr.join('/');
      return [packageName, pageName];
    }
    packageName += `/${pathArr.shift()}`;
  } while (pathArr.length > 0);

  return [];
};

/**
 * 从路径拆分分包名和页面名
 */
export const splitPackageNameAndPageNameFromPathname = (pathname: string): string[] => {
  if (!pathname) {
    return [];
  }

  const pathArr = pathname.split('/');
  if (pathArr.length === 1) {
    return [pathname, 'index'];
  }

  const pageName = pathArr.pop();
  return [pathArr.join('/'), pageName!];
};

/**
 * 获取现在时间
 */
export const getDateTimeString = (date: Date, range: 'date' | 'time'): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');

  if (range === 'date') {
    return `${year}-${month}-${day}`;
  }

  return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
};

export const getPrivateKeyPath = (mpRoot: string, relative?: boolean): string => {
  const fileList = fsx.readdirSync(mpRoot);
  const privateKeyPath = fileList.filter((filename) => /^private\.[a-zA-Z0-9]+\.key$/.test(filename))[0] || '';
  return relative ? privateKeyPath : path.resolve(mpRoot, privateKeyPath);
};

/**
 * 文件夹是否为空
 * @param pathname
 * @param ignores 在判断时将忽略此列表内的文件（夹）
 */
export const isEmptyDir = (pathname: string, ignores: string[] = []): boolean => {
  try {
    const dir = fsx.readdirSync(pathname);

    const dirFiles = dir.filter((f) => !ignores.includes(f));

    return dirFiles.length === 0;
  } catch (error) {
    return true;
  }
};

/**
 * 获取第二个路径相对于第一个路径的相对路径
 * @param from
 * @param to
 */
export const relative = (from: string, to: string): string => {
  const relativePath = path.relative(from, to);

  if (!relativePath) {
    return '.';
  }

  return !/^\./.test(relativePath) ? `./${relativePath}` : relativePath;
};

/**
 * 生成对应 css 预处理器的文件名
 * input: filename: 'index', type: less
 * output: 'index.less'
 */
export const getCssFilename = (filename: string, type: ImpConfig['cssPreprocessor']): string => {
  switch (type) {
    case 'sass':
      return `${filename}.scss`;
    case 'less':
      return `${filename}.less`;
    default:
      return `${filename}.css`;
  }
};

/**
 * 获取项目地址
 */
export const getGitRepoUrl = (): string => {
  try {
    const url = spawnSync('git', ['remote', '-v'], {
      stdio: [0],
    })?.toString();
    const match = url.match(/https?.*\.git/);
    return match ? match[0] : '';
  } catch (e) {
    return '';
  }
};
