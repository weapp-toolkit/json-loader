/**
 *
 * @param rootPath 根路径
 * @param filePath 文件路径，含跟路径
 * @description
 * 获取文件路径，除根路径外.
 *
 */
export const getFileBasePath = (rootPath: string, filePath:string):string => {
  return filePath.replace(rootPath, '').replace(/^\//, '');
};
