import type { Schema } from '../../../strava-api/src/mod.ts';
import type { Metres, Seconds } from './dep.ts';
import type { SegmentSummary } from './summary.ts';
import type * as Segment from './types.ts';

export class SegmentBase {
  data: Schema.SummarySegment = {} as Schema.SummarySegment;
  id: Segment.Id = 0;
  name: Segment.Name = '';
  elapsed_time: Seconds = 0;
  moving_time: Seconds = 0;
  distance: Metres = 0;

  constructor(data: SegmentSummary) {
    Object.assign(this, data);
  }
}
