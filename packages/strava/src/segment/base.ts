import type { Metres, Seconds } from './dep.ts';
import type { SegmentSummary } from './summary.ts';
import type * as Segment from './types.ts';

export class SegmentBase {
  id: Segment.Id;
  name: Segment.Name;
  elapsed_time: Seconds;
  moving_time: Seconds;
  distance: Metres;

  constructor(data: SegmentSummary) {
    Object.assign(this, data);
  }
}
