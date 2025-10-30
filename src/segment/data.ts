import type { Seconds } from '@epdoc/duration';
import type { Metres } from '../types.ts';
import { StravaCoord } from './../strava-api';
import { SegmentBase } from './base.ts';
import type { SegmentSummary } from './summary.ts';
import type * as Segment from './types.ts';

export class SegmentData {
  id: Segment.Id;
  name: Segment.Name;
  elapsedTime: Seconds;
  movingTime: Seconds;
  distance: Metres;
  coordinates: StravaCoord[] = [];
  country: string;
  state: string;

  constructor(data: SegmentBase | SegmentSummary) {
    if (data instanceof SegmentBase) {
      return data.toSegmentData();
    } else {
      this.id = data.id;
      this.name = data.name;
      this.elapsedTime = data.elapsed_time;
      this.movingTime = data.moving_time;
      this.distance = data.distance;
    }
  }
}
