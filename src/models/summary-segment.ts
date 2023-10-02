import { Dict } from 'epdoc-util';
import { SegmentCacheEntry } from '../segment-cache-file';
import { Metres } from '../util';
import { StravaCoord } from './../strava-api';
import { SegmentBase } from './segment-base';

export class SummarySegment extends SegmentBase {
  private _isSummarySegment = true;
  coordinates: StravaCoord[] = [];
  average_grade: number;
  elevation_high: Metres;
  elevation_low: Metres;
  country: string;
  state: string;

  constructor(data: Dict) {
    super(data);
  }

  static newFromResponseData(data: Dict): SummarySegment {
    return new SummarySegment(data);
  }

  get isSummarySegment(): boolean {
    return this._isSummarySegment;
  }

  static isInstance(val: any): val is SummarySegment {
    return val && val.isSummarySegment;
  }

  asCacheEntry(): SegmentCacheEntry {
    return {
      name: this.name ? this.name.trim() : '',
      distance: this.distance,
      gradient: this.average_grade,
      elevation: this.elevation_high - this.elevation_low,
    };
  }
}
