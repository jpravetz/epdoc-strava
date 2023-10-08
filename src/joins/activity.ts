import { durationUtil } from 'epdoc-timeutil';
import { Dict, isArray, isString } from 'epdoc-util';
import { DetailedActivity, DetailedSegmentEffort, SummaryActivity } from 'strava';
import { IsoDateString, Kilometres, LogFunctions, LogOpts, Metres, Seconds, StravaCoord } from '../types';
import { BasicStravaConfig } from './../basic-strava-config';
import { SegmentData, newSegmentData } from './segment-data';
// import { SegmentData } from './segment-data';

export type ActivityFilter = {
  commuteOnly?: boolean;
  nonCommuteOnly?: boolean;
  include?: string[];
  exclude?: string[];
};

export type ActivityOpts = LogOpts & {
  aliases?: Dict;
};

const REGEX = {
  noKmlData: /^(Workout|Yoga|Weight Training)$/i,
};

export class Activity {
  private _isActivity = true;
  private _config: BasicStravaConfig;
  public summary: SummaryActivity;
  public details: DetailedActivity;
  private _coordinates: StravaCoord[] = []; // will contain the latlng coordinates for the activity

  public description: string;
  public data: Dict; // contains arbitrary data
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

  public commute: boolean;
  // public type: string;
  public startDate: Date;
  private _log: LogFunctions;
  private _aliases: Dict;

  private _asString: string;
  private _segments: SegmentData[]; // list of starred segments for this Activity

  constructor(data: SummaryActivity, config: BasicStravaConfig, opts: ActivityOpts) {
    this.summary = data;
    this._log = opts.log;
    this._aliases = opts.aliases;
    this.startDate = new Date(this.summary.start_date);
    const d = Math.round(this.summary.distance / 100) / 10;
    this._asString = `${this.summary.start_date_local.slice(0, 10)}, ${this.summary.type} ${d} km, ${
      this.summary.name
    }`;
  }

  addDetails(details: DetailedActivity): Activity {
    this.details = details;
    return this;
  }

  public static isInstance(val: any): val is Activity {
    return val && val._isActivity === true;
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
    return this.summary.name;
  }

  public get id(): number {
    return this.summary.id;
  }

  public get movingTime(): Seconds {
    return this.summary.moving_time;
  }

  public get elapsedTime(): Seconds {
    return this.summary.elapsed_time;
  }

  public get distance(): Metres {
    return this.summary.distance;
  }

  public distanceRoundedKm(): Kilometres {
    return Math.round(this.summary.distance / 10) / 100;
  }

  public get totalElevationGain(): Metres {
    return this.summary.total_elevation_gain;
  }

  public get averageTemp(): number {
    return this.summary.average_temp;
  }

  public get deviceName(): string {
    return this.details ? this.details.device_name : null;
  }

  public get gearId(): string {
    return this.summary.gear_id;
  }

  public get startDateLocal(): IsoDateString {
    return this.summary.start_date_local;
  }

  public get segments(): SegmentData[] {
    return this._segments;
  }

  public get type(): string {
    return this.summary.type;
  }

  public isRide(): boolean {
    return this.summary.type === 'Ride' || this.summary.type === 'EBikeRide';
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
  public addFromDetailedActivity(): Activity {
    this._log.info('  Adding activity details for ' + this.toString());
    if (this.details) {
      this._addDescriptionFromDetailedActivity();
      if (isArray(this.details.segment_efforts)) {
        this._addDetailSegmentsFromDetailedActivity();
      }
    }
    return this;
  }

  /**
   * This is specific to my needs. Need to look at how to generalize, or remove
   * from this package.
   * @returns
   */
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
    this._config.getSummarySegmentCache().then((segs) => {
      this.details.segment_efforts.forEach((effort) => {
        // @ts-ignore
        const seg = BasicStravaConfig.getSummarySegmentByName(effort.name);
        if (seg) {
          this._log.info(`  Found starred segment ${effort.name}`);
          this._addDetailSegmentEffort(effort);
        }
      });
    });
    return this;
  }

  private _addDetailSegmentEffort(segEffort: DetailedSegmentEffort) {
    let name = String(segEffort.name).trim();
    if (this._aliases && this._aliases[name]) {
      name = this._aliases[name];
      segEffort.name = name;
    }
    const sd: string = durationUtil(segEffort.elapsed_time * 1000, ':').format({ ms: false });
    this._log.info(`  Adding segment '${name}, elapsed time ${sd}`);
    // Add segment to this activity
    this._segments.push(newSegmentData(segEffort));
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
