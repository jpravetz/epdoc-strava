import { SegmentBase } from './base.ts';
import type { Coord, Metres, Seconds } from './dep.ts';
import type * as Segment from './types.ts';

export class SegmentData {
  id: Segment.Id = 0;
  name: Segment.Name = '';
  elapsedTime: Seconds = 0;
  movingTime: Seconds = 0;
  distance: Metres = 0;
  coordinates: Coord[] = [];
  country: string = '';
  state: string = '';

  constructor(data: SegmentBase) {
    if (data instanceof SegmentBase) {
      this.id = data.id;
      this.name = data.name;
      this.elapsedTime = data.elapsed_time;
      this.movingTime = data.moving_time;
      this.distance = data.distance;
    }
  }
}
