import $ from 'lodash';

type O = Record<string, any>;

/**
 * 对象合并
 * @param o1 对象1
 * @param o2 对象2
 */
export const merge = <T extends O, P extends O>(o1: T, o2: P): T & P =>
  $.mergeWith(o1, o2, function customizer(objValue, srcValue) {
    if ($.isArray(objValue)) {
      return $.isArray(srcValue) ? Array.from(new Set(objValue.concat(srcValue))) : srcValue;
    }
  });
