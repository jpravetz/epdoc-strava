import { Dict } from 'epdoc-util';
import { Metres, Seconds } from '../util';
import { SegmentId } from './segment';
import { SegmentData } from './segment-data';

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
