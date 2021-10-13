type PromisifyFunc<T extends (...args: any) => any> = T extends (...args: any) => infer P
  ? (...args: Parameters<T>) => Promise<P>
  : any;
type Promiseble = typeof Array.prototype.forEach | typeof Array.prototype.map;

export const promiseParallel = async <T extends any[]>(
  promiseble: Promiseble,
  array: T,
  callback: PromisifyFunc<Parameters<Promiseble>[0]>,
): Promise<ReturnType<Promiseble>> => {
  return new Promise((resolve) => {
    let finishCount = 0;

    const result: ReturnType<Promiseble> = promiseble.call(array, async (...args) => {
      finishCount++;
      const res = await callback.apply(array, args);
      if (--finishCount <= 0) {
        finish();
      }
      return res;
    });

    function finish() {
      if (Array.isArray(result)) {
        resolve(Promise.all(result));
      }
      resolve(Promise.resolve(result));
    }
  });
};
