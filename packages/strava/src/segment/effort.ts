import * as Duration from '@epdoc/duration';
import type { Dict } from '@epdoc/type';
import { Fmt } from '../fmt.ts';
import { SegmentBase } from './base.ts';
import { SegmentData } from './data.ts';
import type { Ctx, Seconds } from './dep.ts';

export class SegmentEffort extends SegmentBase {
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

  toSegmentData(): SegmentData {
    return new SegmentData({
      id: this.id,
      name: this.name,
      elapsedTime: this.elapsed_time,
      movingTime: this.moving_time,
      distance: this.distance,
    });
  }

  buildKmlDescription(ctx: Ctx.Context) {
    ctx.log.verbose.h2('outputOptions').value(this.outputOptions).emit();
    //console.log(segment.keys)
    if (this.more) {
      const arr = [];
      arr.push(SegmentEffort.kvString('Distance', Fmt.getDistanceString(this.distance)));
      arr.push(
        SegmentEffort.kvString('Elevation', Fmt.getElevationString(this.elevation_high - this.elevation_low)),
      );
      arr.push(SegmentEffort.kvString('Gradient', Fmt.precision(this.average_grade, 100, '%')));
      this.efforts.forEach((effort) => {
        const key = effort.start_date_local.replace(/T.*$/, '');
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

  static timeString(seconds: Seconds) {
    const opts: Duration.Format.Options = {
      millisecondsDisplay: 'auto',
    };
    const formatter = new Duration.Formatter(opts);
    const duration = new Duration(seconds);
    return dateutil.formatMS(seconds * 1000, { ms: false, hours: true });
  }
}
