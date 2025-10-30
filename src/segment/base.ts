import type { Seconds } from '@epdoc/duration';
import * as Segment from '../segment/mod.ts';
import type { Metres } from '../types.ts';
import type { SegmentSummary } from './summary.ts';

export class SegmentBase {
  id: Segment.Id;
  name: Segment.Name;
  elapsed_time: Seconds;
  moving_time: Seconds;
  distance: Metres;

  constructor(data: SegmentSummary) {
    Object.assign(this, data);
  }

  toSegmentData(): Segment.Data {
    return new Segment.Data({
      id: this.id,
      name: this.name,
      elapsedTime: this.elapsed_time,
      movingTime: this.moving_time,
      distance: this.distance,
    });
  }
}
