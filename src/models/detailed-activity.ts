import { isString } from 'epdoc-util';
import { Dict } from '../util';
import { isNumber, isBoolean } from 'util';

export class DetailedActivity {
  description?: string;
  segment_efforts?: Dict[];

  constructor(data) {
    Object.assign(this, data);
  }

  static newFromResponseData(data): DetailedActivity {
    return new DetailedActivity(data);
  }

  static isInstance(val: any): val is DetailedActivity {
    return val && isNumber(val.id) && isBoolean(val.commute);
  }
}
