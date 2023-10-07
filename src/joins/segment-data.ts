import { StravaCoord } from '../strava-api';
import { Metres, Seconds } from '../util';
import { SegmentId } from './segment';
import { SegmentBase, SegmentName } from './segment-base';

export class SegmentData {
  private _isSegmentData = true;
  id: SegmentId;
  name: SegmentName;
  elapsedTime: Seconds;
  movingTime: Seconds;
  distance: Metres;
  coordinates: StravaCoord[] = [];
  country: string;
  state: string;

  constructor(data: any) {
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

  get isSegmentData(): boolean {
    return this._isSegmentData;
  }

  static isInstance(val: any): val is SegmentData {
    return val && val.isSegmentData;
  }
}
