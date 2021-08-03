import { Compiler, EntryPlugin } from 'webpack';
import fsx from 'fs-extra';
import path from 'path';
import glob from 'glob';
import chalk from 'chalk';
import globToReg from 'glob-to-regexp';
import { IWeappAppConfig } from '@weapp-toolkit/weapp-types';

/**
 * 获取 app 入口文件路径
 * @param compiler
 * @returns {String} appPath
 */
export const getAppEntry = (compiler: Compiler): string => {
  const { entry } = compiler.options;
  let app;

  if ('app' in entry) {
    app = entry.app?.import?.[0];
  }

  if (!app) {
    throw new Error('找不到小程序入口文件 app.json');
  }

  return app;
};

/**
 * 添加模块依赖
 * @param context
 * @param entryPath
 * @param chunkName
 * @param compiler
 */
export const addEntry = (context: string, entryPath: string, chunkName: string, compiler: Compiler): void => {
  new EntryPlugin(context, entryPath, chunkName).apply(compiler);
};

type EntryType = Record<string, string>;

type ComponentJson = {
  usingComponents: EntryType;
};

function shouldIgnore(filePath: string, ignores: RegExp[]) {
  return ignores.some((reg) => {
    return reg.test(filePath);
  });
}

/**
 * 获取未知后缀的 ts | js 文件
 */
function getEntryFile(filename: string) {
  let fileBasename = filename.replace(path.extname(filename), '');

  const entryFilePath = fsx.existsSync(`${fileBasename}.ts`)
    ? `${fileBasename}.ts`
    : `${fileBasename}.js`;
  if (fsx.existsSync(entryFilePath)) {
    return entryFilePath;
  }
  fileBasename = path.join(fileBasename, 'index');
  return fsx.existsSync(`${fileBasename}.ts`)
    ? `${fileBasename}.ts`
    : `${fileBasename}.js`;
}

function isRelativePath(pathname: string) {
  return !pathname.startsWith('/');
}

function isNodeModule(pathname: string) {
  return /^[@a-zA-Z]/.test(pathname);
}

function getAddToEntries(
  srcRoot: string,
  ignores: RegExp[],
  entries: EntryType,
  resolve?: (...args: any[]) => any
) {
  let moduleCount = 0;

  // 判断是否将所有入口文件读取完
  function count(n: number) {
    moduleCount += n;
    if (moduleCount === 0 && resolve) {
      resolve();
    }
  }

  function addToEntries(dependencies: string[], from?: string) {
    dependencies.forEach((p) => {
      if (shouldIgnore(p, ignores)) {
        return;
      }

      // 入口文件
      const entryFilename = getEntryFile(path.join(srcRoot, p));
      // 去掉后缀的入口文件名
      const fileBasename = entryFilename.replace(/\.(ts|js)$/, '');
      // 作为输出的相对路径
      const entryKey = path.relative(srcRoot, fileBasename);
      // 相对路径，用于拼接
      const dirname = path.dirname(entryKey);

      // 如果已经存在则跳过
      if (entries[entryKey]) {
        return;
      }

      // 异步时调用
      if (resolve) {
        count(1);
        fsx
          .readJSON(`${fileBasename}.json`)
          .then((fileJson: ComponentJson) => {
            // 读取到 Json 表示是有效的，有效组件才放进去
            entries[entryKey] = entryFilename;

            const comps = Object.values(fileJson.usingComponents || {}).map((pathname: string) => {
              return isRelativePath(pathname)
                ? path.join(dirname, pathname)
                : pathname.replace(/^\//, '');
            });
            addToEntries(comps);
            count(-1);
          })
          .catch(() => {
            count(-1);
            console.log(chalk.yellow(`Component not found: ${path.dirname(fileBasename)}, used by ${chalk.green(from)}\n`));
          });
        return;
      }

      try {
        const fileJson: ComponentJson = fsx.readJSONSync(`${fileBasename}.json`);
        // 读取到 Json 表示是有效的，有效组件才放进去
        entries[entryKey] = entryFilename;
        const comps = Object.values(fileJson.usingComponents || {}).map((pathname: string) => {
          // /components 这种路径是相对于 src 目录的
          return isRelativePath(pathname)
            ? path.join(dirname, pathname)
            : pathname.replace(/^\//, '');
        });
        addToEntries(comps, `${fileBasename}.json`);
      } catch (e) {
        console.log(chalk.yellow(`Component not found: ${path.dirname(fileBasename)}, used by ${chalk.green(from)}\n`));
      }
    });
  }

  return addToEntries;
}

function _getEntries(
  srcRoot: string,
  ignores: string[] = [],
  sync?: boolean
) {
  const appJson: IWeappAppConfig = fsx.readJSONSync(path.join(srcRoot, 'app.json'));
  const subPackages = appJson.subpackages || appJson.subPackages || [];

  const entries: EntryType = {
    app: getEntryFile(path.join(srcRoot, 'app')),
  };

  const appUsingComponents = Object.values(appJson.usingComponents || {})
    // 过滤掉 node_module 模块，如官方 UI 库
    .filter((comp) => !isNodeModule(comp))
    .map((comp) => {
      return isRelativePath(comp)
        ? comp
        : comp.replace(/^\//, '');
    });
  const ignoresExp = ignores.map((ig) => globToReg(ig));

  if (!sync) {
    return new Promise<EntryType>((resolve) => {
      const _resolve = () => {
        resolve(entries);
      };

      const addToEntries = getAddToEntries(srcRoot, ignoresExp, entries, _resolve);

      addToEntries(appJson.pages, 'app.json');
      addToEntries(appUsingComponents, 'app.json');
      subPackages.forEach(({ root, pages = [] }) => {
        const packagePages = pages.map((p) => path.join(root, p));
        addToEntries(packagePages, root);
      });
    });
  }

  const addToEntries = getAddToEntries(srcRoot, ignoresExp, entries);

  addToEntries(appJson.pages, 'app.json');
  addToEntries(appUsingComponents, 'app.json');
  subPackages.forEach(({ root, pages = [] }) => {
    const packagePages = pages.map((p) => path.join(root, p));
    addToEntries(packagePages, root);
  });

  return entries;
}

export const getAllEntries = (
  srcRoot: string,
  ignore: string[] = []
): EntryType => {
  return glob
    .sync('**/*.wxml', {
      cwd: srcRoot,
      ignore,
    })
    .reduce((o: EntryType, entry) => {
      const entryName = entry.replace('.wxml', '');

      if (!fsx.existsSync(path.join(srcRoot, `${entryName}.json`))) {
        return o;
      }
      const entryFile = getEntryFile(path.join(srcRoot, entryName));
      o[entryName] = entryFile;
      return o;
    }, {});
};

/**
 * 获取入口文件（使用到的 page 和 component）
 */
export const getEntries = (
  srcRoot: string,
  ignores: string[] = []
): Promise<EntryType> => {
  return _getEntries(srcRoot, ignores) as Promise<EntryType>;
};

export const getEntriesSync = (
  srcRoot: string,
  ignores: string[] = []
): EntryType => {
  return _getEntries(srcRoot, ignores, true) as EntryType;
};

type GetEntriesAndUnusedPathsReturn = { entries: EntryType; unusedPaths: string[] };
export const getEntriesAndUnusedPaths = (
  srcRoot: string,
  ignores: string[] = []
): GetEntriesAndUnusedPathsReturn => {
  const entries = getEntriesSync(srcRoot, ignores);
  const unusedPaths: string[] = [];

  glob
    .sync('**/*.wxml', {
      cwd: srcRoot,
      ignore: ignores,
    })
    .forEach((entry) => {
      const entryName = entry.replace('.wxml', '');

      if (entries[entryName]) {
        return;
      }

      if (!fsx.existsSync(path.join(srcRoot, `${entryName}.json`))) {
        return;
      }

      const entryFile = getEntryFile(path.join(srcRoot, entryName));
      unusedPaths.push(path.relative(srcRoot, path.dirname(entryFile)));
      console.log(chalk.yellow(`Unused Component: ${entryFile}\n`));
    });

  return { entries, unusedPaths };
};
