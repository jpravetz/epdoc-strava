import { SegmentBase } from './segment-base';
import { StravaCoord } from './../strava-api';

export class SummarySegment extends SegmentBase {
  klass: 'SummarySegment';
  coordinates: StravaCoord[] = [];
  country: string;
  state: string;

  constructor(data) {
    super(data);
  }

  static newFromResponseData(data): SummarySegment {
    return new SummarySegment(data);
  }

  static isInstance(val: any): val is SummarySegment {
    return val && val.klass === 'SummarySegment';
  }
}
