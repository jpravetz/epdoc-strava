import { Dict } from 'epdoc-util';
import { StravaCoord, StravaObjId } from './../strava-api';
import { SegmentBase } from './segment-base';

export type SegmentId = StravaObjId;

export class Segment extends SegmentBase {
  private _isSegment = true;
  elevation_high: number;
  elevation_low: number;
  average_grade: number;
  country: string;
  state: string;
  _coordinates: StravaCoord[];
  // more: boolean;
  // efforts: Dict[];

  constructor(data: Dict) {
    super(data);
  }

  static newFromResponseData(data: Dict): Segment {
    return new Segment(data);
  }

  get isSegment(): boolean {
    return this._isSegment;
  }

  static isInstance(val: any): val is Segment {
    return val && val.isSegment === true;
  }
}
