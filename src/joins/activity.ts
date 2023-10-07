import { durationUtil } from 'epdoc-timeutil';
import { Dict, isBoolean, isNumber, isString } from 'epdoc-util';
import { IsoDateString, Kilometres, LogFunctions, LogOpts, Metres, Seconds, StravaCoord, anyXXX } from '../types';
import { SegmentCacheFile } from '../segment-cache-file';
import { SegmentData } from './segment-data';
import { DetailedActivity, DetailedAthlete, SummaryActivity } from 'strava';

export type ActivityFilter = {
  commuteOnly?: boolean;
  nonCommuteOnly?: boolean;
  include?: string[];
  exclude?: string[];
};

export type ActivityOpts = LogOpts & {
  segCacheFile?: SegmentCacheFile;
  aliases?: Dict;
};

const REGEX = {
  noKmlData: /^(Workout|Yoga|Weight Training)$/i,
};

export class Activity {
  public summary: SummaryActivity;
  public details: DetailedActivity;

  public description: string;
  public keys: string[] = [
    'distance',
    'total_elevation_gain',
    'moving_time',
    'elapsed_time',
    'average_temp',
    'device_name',
  ];
  public keyDict: Dict = {
    distance: 'distance',
    totalElevationGain: 'total_elevation_gain',
    movingTime: 'moving_time',
    elapsedTime: 'elapsed_time',
    averageTemp: 'average_temp',
    deviceName: 'device_name',
  };
  public data: Dict = {};

  public commute: boolean;
  // public type: string;
  public startDate: Date;
  private _log: LogFunctions;
  private _segCacheFile: SegmentCacheFile;
  private _aliases: Dict;

  private _asString: string;
  private _segments: SegmentData[]; // list of starred segments for this Activity
  private _coordinates: StravaCoord[] = []; // will contain the latlng coordinates for the activity

  constructor(data: Dict, opts: ActivityOpts) {
    Object.assign(this.data, data);
    this._log = opts.log;
    this._segCacheFile = opts.segCacheFile;
    this._aliases = opts.aliases;
    this.startDate = new Date(this.data.start_date);
    const d = Math.round(this.data.distance / 100) / 10;
    this._asString = `${this.data.start_date_local.slice(0, 10)}, ${this.type} ${d} km, ${this.name}`;
  }

  public static newFromResponseData(data: Dict, opts: ActivityOpts): Activity {
    const result = new Activity(data, opts);
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
  // public addFromDetailedActivity(data: DetailedActivity) {
  //   this._log.info('  Adding activity details for ' + this.toString());
  //   if (DetailedActivity.isInstance(data)) {
  //     if (isString(data.description)) {
  //       this._addDescriptionFromDetailedActivity(data);
  //     }
  //     if (Array.isArray(data.segment_efforts)) {
  //       this._addDetailSegmentsFromDetailedActivity(data);
  //     }
  //   }
  // }

  private _addDescriptionFromDetailedActivity(): Activity {
    if (isString(this.details.description)) {
      const p: string[] = this.details.description.split(/\r\n/);
      // this._log.info(p)
      if (p && p.length) {
        const a = [];
        p.forEach((line) => {
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
        this.description = this.details.description;
      }
      this.keys.push('description');
    }
    return this;
  }

  private _addDetailSegmentsFromDetailedActivity(): Activity {
    this._segments = [];
    this.details.segment_efforts.forEach((effort) => {
      // @ts-ignore
      if (this._segCacheFile) {
        const seg = this._segCacheFile.getSegment(effort.name);
        if (seg) {
          this._log.info('  Found starred segment ' + effort.name);
          this._addDetailSegment(effort);
        }
      }
    });
    return this;
  }

  private _addDetailSegment(segEffort: anyXXX) {
    let name = String(segEffort.name).trim();
    if (this._aliases && this._aliases[name]) {
      name = this._aliases[name];
      segEffort.name = name;
    }
    const sd: string = durationUtil(segEffort.elapsed_time * 1000, ':').format({ ms: false });
    this._log.info(`  Adding segment '${name}, elapsed time ${sd}`);
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
