import { SegmentBase } from './segment-base';
import { SegmentData } from './segment-data';
import { isNumber, isString } from 'epdoc-util';
import { Dict, getDistanceString, getElevationString, Seconds, precision } from './../util';
import * as dateutil from 'dateutil';
import { StravaObjId } from '../strava-api';
import { SegmentId } from './segment';

export type SegmentEffortId = StravaObjId;

export class SegmentEffort extends SegmentBase {
  klass = 'SegmentEffort';
  country: string;
  state: string;
  coordinates: any;
  more: boolean;
  efforts: Dict[];
  elevation_high: number;
  elevation_low: number;
  average_grade: number;

  constructor(data) {
    super(data);
  }

  static newFromResponseData(data): SegmentEffort {
    return new SegmentEffort(data);
  }

  static isInstance(val: any): val is SegmentEffort {
    return val && isNumber(val.id) && isString(val.country);
  }

  toSegmentData(): SegmentData {
    return new SegmentData({
      id: this.id,
      name: this.name,
      elapsedTime: this.elapsed_time,
      movingTime: this.moving_time,
      distance: this.distance
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
      this.efforts.forEach(effort => {
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
    return dateutil.formatMS(seconds * 1000, { ms: false, hours: true });
  }
}
