import { Dict } from 'epdoc-util';
import { SegmentCacheEntry } from '../segment-cache-file';
import { StravaCoord } from '../strava-api';
import { Metres } from '../util';
import { SegmentBase } from './segment-base';

/**
 * A shortened amount of Segment data that is suited to cached storage.™
 */
export class SegmentSummary extends SegmentBase {
  private _isSegmentSummary = true;
  public coordinates: StravaCoord[] = [];
  public average_grade: number;
  public elevation_high: Metres;
  public elevation_low: Metres;
  public country: string;
  public state: string;

  constructor(data: Dict) {
    super(data);
  }

  static newFromResponseData(data: Dict): SegmentSummary {
    return new SegmentSummary(data);
  }

  get isSegmentSummary(): boolean {
    return this._isSegmentSummary;
  }

  static isInstance(val: any): val is SegmentSummary {
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
