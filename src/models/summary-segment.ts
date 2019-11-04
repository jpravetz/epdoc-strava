import { SegmentCacheEntry } from './../segment-file';
import { SegmentBase } from './segment-base';
import { StravaCoord } from './../strava-api';
import { Metres } from '../util';

export class SummarySegment extends SegmentBase {
  klass: 'SummarySegment';
  coordinates: StravaCoord[] = [];
  average_grade: number;
  elevation_high: Metres;
  elevation_low: Metres;
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

  asCacheEntry(): SegmentCacheEntry {
    return {
      name: this.name ? this.name.trim() : '',
      distance: this.distance,
      gradient: this.average_grade,
      elevation: this.elevation_high - this.elevation_low
    };
  }
}
