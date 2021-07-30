/**
 * 首字母大写
 * @param word
 * @returns
 */
export const firstLetterUppercase = (word: string) => {
  return String(word).replace(/^\w/, (l) => {
    return l.toUpperCase();
  });
};
