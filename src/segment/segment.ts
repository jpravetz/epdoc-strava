import { StravaCoord, StravaObjId } from './../strava-api';
import { SegmentBase } from './segment-base';

export type SegmentId = StravaObjId;

export class Segment extends SegmentBase {
  klass: string = 'Segment';
  elevation_high: number;
  elevation_low: number;
  average_grade: number;
  country: string;
  state: string;
  _coordinates: StravaCoord[];
  // more: boolean;
  // efforts: Dict[];

  constructor(data) {
    super(data);
  }

  static newFromResponseData(data): Segment {
    return new Segment(data);
  }

  static isInstance(val: any): val is Segment {
    return val && val.klass === 'Segment';
  }
}
