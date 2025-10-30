import { SegmentBase } from './base.ts';
import type { Metres, Seconds, Strava } from './dep.ts';
import type * as Segment from './types.ts';

export class SegmentData {
  id: Segment.Id;
  name: Segment.Name;
  elapsedTime: Seconds;
  movingTime: Seconds;
  distance: Metres;
  coordinates: Strava.Coord[] = [];
  country: string;
  state: string;

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
