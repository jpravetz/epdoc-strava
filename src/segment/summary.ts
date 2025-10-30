import type { Metres } from '../types.ts';
import { StravaCoord } from './../strava-api';
import { SegmentBase } from './base.ts';
import type * as Segment from './types.ts';

export class SegmentSummary extends SegmentBase {
  coordinates: StravaCoord[] = [];
  average_grade: number;
  elevation_high: Metres;
  elevation_low: Metres;
  country: string;
  state: string;

  constructor(data) {
    super(data);
  }

  static newFromResponseData(data): SegmentSummmary {
    return new SegmentSummmary(data);
  }

  asCacheEntry(): Segment.CacheEntry {
    return {
      name: this.name ? this.name.trim() : '',
      distance: this.distance,
      gradient: this.average_grade,
      elevation: this.elevation_high - this.elevation_low,
    };
  }
}
