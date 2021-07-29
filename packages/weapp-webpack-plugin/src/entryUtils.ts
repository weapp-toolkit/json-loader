import { Compiler, EntryPlugin } from 'webpack';

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
