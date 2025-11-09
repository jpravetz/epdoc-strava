import { SegmentBase } from './base.ts';
import type { Coord, Metres } from './dep.ts';
import type * as Segment from './types.ts';

export class SegmentSummary extends SegmentBase {
  coordinates: Coord[] = [];
  average_grade: number = 0;
  elevation_high: Metres = 0;
  elevation_low: Metres = 0;
  country: string = '';
  state: string = '';

  constructor(data: unknown) {
    super(data as Segment.CacheEntry);
  }

  static newFromResponseData(data: unknown): SegmentSummary {
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
