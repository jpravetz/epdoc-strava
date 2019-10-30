import { SegmentEffort } from './segment-effort';
import { isString } from 'epdoc-util';
import { Dict } from '../util';
import { isNumber, isBoolean } from 'util';
import { Segment } from './segment';

/**
 * We fetch DetailedActivity from Strava and pick data from this object and add
 * it to Activity object.
 */
export class DetailedActivity {
  description?: string;
  segment_efforts?: SegmentEffort[];

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
