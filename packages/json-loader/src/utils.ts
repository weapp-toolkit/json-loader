import { IWeappConfigJSON, WeappConfigType } from './types';

export const getConfigJsonType = (json: Partial<IWeappConfigJSON>): WeappConfigType | void => {
  if ('component' in json) {
    return json.component ? 'component' : 'page';
  }
  if ('pages' in json) {
    return 'app';
  }
};
