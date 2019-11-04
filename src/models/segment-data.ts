import { SegmentBase, SegmentName } from './segment-base';
import { StravaCoord } from './../strava-api';
import { Seconds, Metres } from './../util';
import { SegmentId } from './segment';

export class SegmentData {
  klass = 'SegmentData';
  id: SegmentId;
  name: SegmentName;
  elapsedTime: Seconds;
  movingTime: Seconds;
  distance: Metres;
  coordinates: StravaCoord[] = [];
  country: string;
  state: string;

  constructor(data) {
    if (SegmentBase.isInstance(data)) {
      return data.toSegmentData();
    } else {
      this.id = data.id;
      this.name = data.name;
      this.elapsedTime = data.elapsed_time;
      this.movingTime = data.moving_time;
      this.distance = data.distance;
    }
  }

  // static newFromResponseData(data): Segment {
  //   return new Segment(data);
  // }

  static isInstance(val: any): val is SegmentData {
    return val && val.klass === 'SegmentData';
  }
}
