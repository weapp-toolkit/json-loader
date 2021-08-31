import $ from 'lodash';

type Promiseble = typeof Array.prototype.forEach | typeof Array.prototype.map;
type OriginCallback = Parameters<Promiseble>[0];
type Callback = (...args: Parameters<OriginCallback>) => Promise<ReturnType<OriginCallback>>;

export const promiseParallel = async <T extends any[]>(
  promiseble: Promiseble,
  array: T,
  callback: Callback,
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
      if ($.isArray(result)) {
        resolve(Promise.all(result));
      }
      resolve(Promise.resolve(result));
    }
  });
};
