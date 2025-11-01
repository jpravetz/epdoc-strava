import { SegmentBase } from './base.ts';
import type { Metres, Strava } from './dep.ts';
import type * as Segment from './types.ts';

export class SegmentSummary extends SegmentBase {
  coordinates: Strava.Coord[] = [];
  average_grade: number;
  elevation_high: Metres;
  elevation_low: Metres;
  country: string;
  state: string;

  constructor(data) {
    super(data);
  }

  static newFromResponseData(data): SegmentSummary {
    return new SegmentSummary(data);
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
