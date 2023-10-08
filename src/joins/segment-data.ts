import { Dict, isDict } from 'epdoc-util';
import { DetailedSegmentEffort, MetaActivity, MetaAthlete, ResourceState, SummarySegmentEffort } from 'strava';
import { Seconds } from '../types';

export type SegmentName = string;
export type SegmentId = number;

export function newSegmentData(data: SummarySegmentEffort | DetailedSegmentEffort): SegmentData {
  return new SegmentData(data);
}

// export function newSegmentDataFromSummarySegmentEffort(data: SummarySegmentEffort) {
//   return new SegmentData().fromSummarySegmentEffort(data);
// }

// export function newSegmentDataFromDetailedSegmentEffort(data: DetailedSegmentEffort) {
//   return new SegmentData().fromDetailedSegmentEffort(data);
// }

export function isDetailedSegmentEffort(val: any): val is DetailedSegmentEffort {
  return isDict(val) && val.hasOwnProperty('resource_state');
}
export function isSummarySegmentEffort(val: any): val is SummarySegmentEffort {
  return isDict(val) && !val.hasOwnProperty('resource_state');
}

export class SegmentData {
  private _isSegmentData = true;
  id: SegmentId;
  name: SegmentName;
  startDate: string;
  startDateLocal: string;
  elapsedTime: Seconds;
  movingTime: Seconds;
  isKom: boolean;
  resourceState: ResourceState;
  activity: MetaActivity;
  athlete: MetaAthlete;
  start_date: string;
  start_date_local: string;
  distance: number;
  startIndex: number;
  endIndex: number;
  prRank: string;
  achievements: Dict[];

  // distance: Metres;
  // coordinates: StravaCoord[] = [];
  // country: string;
  // state: string;

  constructor(data?: SummarySegmentEffort | DetailedSegmentEffort) {
    if (isDetailedSegmentEffort(data)) {
      this.fromDetailedSegmentEffort(data);
    } else if (isSummarySegmentEffort(data)) {
      this.fromSummarySegmentEffort(data);
    }
  }

  public fromSummarySegmentEffort(data: SummarySegmentEffort): SegmentData {
    this.id = data.id;
    this.elapsedTime = data.elapsed_time;
    this.startDate = data.start_date;
    this.startDateLocal = data.start_date_local;
    this.distance = data.distance;
    this.isKom = data.is_kom;
    return this;
  }

  public fromDetailedSegmentEffort(data: DetailedSegmentEffort): SegmentData {
    this.id = data.id;
    this.elapsedTime = data.elapsed_time;
    this.startDate = data.start_date;
    this.startDateLocal = data.start_date_local;
    this.distance = data.distance;
    this.movingTime = data.moving_time;
    this.startIndex = data.start_index;
    this.endIndex = data.end_index;
    this.prRank = data.pr_rank;
    this.achievements = data.achievements;
    this.activity = data.activity;
    this.athlete = data.athlete;
    this.resourceState = data.resource_state;
    return this;
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
