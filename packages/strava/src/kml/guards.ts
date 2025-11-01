import { _ } from '@epdoc/type';
import { Api } from '../dep.ts';
import type { LineStyle } from './types.ts';

export function isValidActivityType(name: string): name is Api.ActivityType {
  // Define what constitutes a valid ActivityType, for example:
  return name in Api.ActivityName || name === 'Default';
}

export function isValidLineStyle(val: LineStyle): val is LineStyle {
  return !!(val && _.isString(val.color) && _.isNumber(val.width) && _.isHexString(val.color, 8));
}
