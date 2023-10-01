import { durationUtil } from 'epdoc-timeutil';
import { Dict } from 'epdoc-util';
import { StravaObjId } from '../strava-api';
import { getDistanceString, getElevationString, precision } from './../util';
import { SegmentBase } from './segment-base';
import { SegmentData } from './segment-data';

export type SegmentEffortId = StravaObjId;

export class SegmentEffort extends SegmentBase {
  private _isSegmentEffort = true;
  country: string;
  state: string;
  coordinates: any;
  more: boolean;
  efforts: Dict[];
  elevation_high: number;
  elevation_low: number;
  average_grade: number;

  constructor(data: Dict) {
    super(data);
  }

  static newFromResponseData(data: Dict): SegmentEffort {
    return new SegmentEffort(data);
  }

  get isSegmentEffort(): boolean {
    return this._isSegmentEffort;
  }

  static isInstance(val: any): val is SegmentEffort {
    return val && val.isSegmentEffort;
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

  buildKmlDescription() {
    //console.log(this.outputOptions)
    //console.log(segment.keys)
    if (this.more) {
      let arr = [];
      arr.push(SegmentEffort.kvString('Distance', getDistanceString(this.distance)));
      arr.push(SegmentEffort.kvString('Elevation', getElevationString(this.elevation_high - this.elevation_low)));
      arr.push(SegmentEffort.kvString('Gradient', precision(this.average_grade, 100, '%')));
      this.efforts.forEach((effort) => {
        let key = effort.start_date_local.replace(/T.*$/, '');
        let value = SegmentEffort.timeString(effort.elapsed_time);
        if (effort.elapsed_time !== effort.moving_time) {
          value += ' (' + SegmentEffort.timeString(effort.moving_time) + ')';
        }
        arr.push(SegmentEffort.kvString(key, value));
      });
      //console.log(arr);
      return '<![CDATA[' + arr.join('<br>\n') + ']]>';
    }
  }

  static kvString(k, v) {
    return '<b>' + k + ':</b> ' + v;
  }

  static timeString(seconds) {
    return durationUtil(seconds * 1000).format({ ms: false });
  }
}
