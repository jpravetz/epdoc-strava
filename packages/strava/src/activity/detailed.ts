import type * as Segment from '../segment/mod.ts';

/**
 * We fetch DetailedActivity from Strava and pick data from this object and add
 * it to Activity object.
 */
export class ActivityDetailed {
  description?: string;
  segment_efforts?: Segment.Effort[];

  constructor(data) {
    Object.assign(this, data);
  }

  static newFromResponseData(data): ActivityDetailed {
    return new ActivityDetailed(data);
  }
}
