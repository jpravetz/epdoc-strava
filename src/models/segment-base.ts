import { SegmentData } from './segment-data';
import { Seconds, Metres } from './../util';
import { SegmentId } from './segment';
import { Dict } from 'epdoc-util';

export type SegmentName = string;

export class SegmentBase {
  private _isSegmentBase = true;
  id: SegmentId;
  name: SegmentName;
  elapsed_time: Seconds;
  moving_time: Seconds;
  distance: Metres;

  constructor(data: Dict) {
    Object.assign(this, data);
  }

  get isSegmentBase(): boolean {
    return this._isSegmentBase;
  }

  static isInstance(val: any): val is SegmentBase {
    return val && val.isSegmentBase === true;
  }

  toSegmentData(): SegmentData {
    return new SegmentData({
      id: this.id,
      name: this.name,
      elapsedTime: this.elapsed_time,
      movingTime: this.moving_time,
      distance: this.distance,
    });
  }
}
