import { Dict, isBoolean, isNumber, isString } from 'epdoc-util';
import { Main } from '../main';
import { StravaCoord } from './../strava-api';
import { IsoDateString, Kilometres, Metres, Seconds } from './../util';
import { DetailedActivity } from './detailed-activity';
import { SegmentData } from './segment-data';
import { SegmentEffort } from './segment-effort';
import {  durationUtil } from 'epdoc-timeutil';

export type ActivityFilter = {
  commuteOnly?: boolean;
  nonCommuteOnly?: boolean;
  include?: string[];
  exclude?: string[];
};

const REGEX = {
  noKmlData: /^(Workout|Yoga|Weight Training)$/i
};

export class Activity {
  public keys: string[] = [
    'distance',
    'total_elevation_gain',
    'moving_time',
    'elapsed_time',
    'average_temp',
    'device_name'
  ];
  public keyDict: Dict = {
    distance: 'distance',
    totalElevationGain: 'total_elevation_gain',
    movingTime: 'moving_time',
    elapsedTime: 'elapsed_time',
    averageTemp: 'average_temp',
    deviceName: 'device_name'
  };
  public data: Dict = {};

  public description: string;
  public main: Main;
  public commute: boolean;
  // public type: string;
  public startDate: Date;

  private _asString: string;
  private _segments: SegmentData[]; // list of starred segments for this Activity
  private _coordinates: StravaCoord[] = []; // will contain the latlng coordinates for the activity

  constructor(data: Dict) {
    Object.assign(this.data, data);
    this.startDate = new Date(this.data.start_date);
    const d = Math.round(this.data.distance / 100) / 10;
    this._asString = `${this.data.start_date_local.slice(0, 10)}, ${this.type} ${d} km, ${this.name}`;
  }

  public static newFromResponseData(data: Dict, main: Main): Activity {
    const result = new Activity(data);
    result.main = main;
    return result;
  }

  public static isInstance(val: any): val is Activity {
    return val && isNumber(val.id) && isBoolean(val.commute);
  }

  public toString(): string {
    return this._asString;
  }

  public get coordinates(): StravaCoord[] {
    return this._coordinates;
  }

  public set coordinates(val: StravaCoord[]) {
    this._coordinates = val;
  }

  public get name(): string {
    return this.data.name;
  }

  public get id(): number {
    return this.data.id;
  }

  public get movingTime(): Seconds {
    return this.data.moving_time;
  }

  public get elapsedTime(): Seconds {
    return this.data.elapsed_time;
  }

  public get distance(): Metres {
    return this.data.distance;
  }

  public distanceRoundedKm(): Kilometres {
    return Math.round(this.data.distance / 10) / 100;
  }

  public get totalElevationGain(): Metres {
    return this.data.total_elevation_gain;
  }

  public get averageTemp(): number {
    return this.data.average_temp;
  }

  public get deviceName(): string {
    return this.data.device_name;
  }

  public get gearId(): string {
    return this.data.gear_id;
  }

  public get startDateLocal(): IsoDateString {
    return this.data.start_date_local;
  }

  public get segments(): SegmentData[] {
    return this._segments;
  }

  public get type(): string {
    return this.data.type;
  }

  public isRide(): boolean {
    return this.data.type === 'Ride' || this.data.type === 'EBikeRide';
  }

  public hasKmlData(): boolean {
    if (!isString(this.type) || REGEX.noKmlData.test(this.type)) {
      return false;
    }
    return this._coordinates.length > 0 ? true : false;
  }

  /**
   * Get starred segment_efforts and descriptions from the DetailedActivity
   * object and add to Acivity.
   * @param data
   */
  public addFromDetailedActivity(data: DetailedActivity) {
    console.log('  Adding activity details for ' + this.toString());
    if (DetailedActivity.isInstance(data)) {
      if (isString(data.description)) {
        this._addDescriptionFromDetailedActivity(data);
      }
      if (Array.isArray(data.segment_efforts)) {
        this._addDetailSegmentsFromDetailedActivity(data);
      }
    }
  }

  private _addDescriptionFromDetailedActivity(data: DetailedActivity): void {
    if (isString(data.description)) {
      const p: string[] = data.description.split(/\r\n/);
      // console.log(p)
      if (p && p.length) {
        const a = [];
        p.forEach(line => {
          const kv = line.match(/^([^\s\=]+)\s*=\s*(.*)+$/);
          if (kv) {
            this.keys.push(kv[1]);
            this[kv[1]] = kv[2];
          } else {
            a.push(line);
          }
        });
        if (a.length) {
          this.description = a.join('\n');
        }
      } else {
        this.description = data.description;
      }
      this.keys.push('description');
    }
  }

  private _addDetailSegmentsFromDetailedActivity(data: DetailedActivity) {
    this._segments = [];
    data.segment_efforts.forEach(effort => {
      // @ts-ignore
      if (this.main.segFile) {
        const seg = this.main.segFile.getSegment(effort.name);
        if (seg) {
          console.log('  Found starred segment', effort.name);
          this._addDetailSegment(effort);
        }
      }
    });
  }

  private _addDetailSegment(segEffort: SegmentEffort) {
    let name = String(segEffort.name).trim();
    const aliases = this.main.config.aliases;
    if (aliases && aliases[name]) {
      name = aliases[name];
      segEffort.name = name;
    }
    const sd:string = durationUtil(segEffort.elapsed_time * 1000,':').format({ms:false});
    console.log(`  Adding segment '${name}, elapsed time ${sd}`);
    // Add segment to this activity
    this._segments.push(new SegmentData(segEffort));
  }

  public include(filter: ActivityFilter) {
    if (
      (!filter.commuteOnly && !filter.nonCommuteOnly) ||
      (filter.commuteOnly && this.commute) ||
      (filter.nonCommuteOnly && !this.commute)
    ) {
      if (Array.isArray(filter.exclude)) {
        if (filter.exclude.indexOf(this.type) >= 0) {
          return false;
        }
      }
      if (Array.isArray(filter.include)) {
        if (filter.include.indexOf(this.type) < 0) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  public static compareStartDate(a: Activity, b: Activity) {
    if (a.startDate < b.startDate) {
      return -1;
    }
    if (a.startDate > b.startDate) {
      return 1;
    }
    return 0;
  }
}
