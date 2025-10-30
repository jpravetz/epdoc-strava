import type { ISODate } from '@epdoc/datetime';
import type { Seconds } from '@epdoc/duration';
import { _, type Dict } from '@epdoc/type';
import { Main } from '../main';
import * as Segment from '../segment/mod.ts';
import type * as Strava from '../strava/mod.ts';
import type { Kilometres, Metres } from '../types.ts';
import { ActivityDetailed } from './detailed.ts';
import type * as Activity from './types.ts';

const REGEX = {
  noKmlData: /^(Workout|Yoga|Weight Training)$/i,
};

export class ActivityBase {
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

  public description: string;
  public main: Main;
  public commute: boolean;
  // public type: string;
  public startDate: Date;

  private _asString: string;
  private _segments: Segment.Data[]; // list of starred segments for this Activity
  private _coordinates: Strava.Coord[] = []; // will contain the latlng coordinates for the activity

  constructor(data: Dict) {
    Object.assign(this.data, data);
    this.startDate = new Date(this.data.start_date);
    const d = Math.round(this.data.distance / 100) / 10;
    this._asString = `${this.data.start_date_local.slice(0, 10)}, ${this.type} ${d} km, ${this.name}`;
  }

  public static newFromResponseData(data: Dict, main: Main): ActivityBase {
    const result = new ActivityBase(data);
    result.main = main;
    return result;
  }

  public toString(): string {
    return this._asString;
  }

  public get coordinates(): Strava.Coord[] {
    return this._coordinates;
  }

  public set coordinates(val: Strava.Coord[]) {
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

  public get startDateLocal(): ISODate {
    return this.data.start_date_local;
  }

  public get segments(): Segment.Data[] {
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
  public addFromDetailedActivity(data: ActivityDetailed) {
    console.log('  Adding activity details for ' + this.toString());
    if (data instanceof ActivityDetailed) {
      if (_.isString(data.description)) {
        this._addDescriptionFromDetailedActivity(data);
      }
      if (Array.isArray(data.segment_efforts)) {
        this._addDetailSegmentsFromDetailedActivity(data);
      }
    }
  }

  private _addDescriptionFromDetailedActivity(data: ActivityDetailed): void {
    if (_.isString(data.description)) {
      const p: string[] = data.description.split(/\r\n/);
      // console.log(p)
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
        this.description = data.description;
      }
      this.keys.push('description');
    }
  }

  private _addDetailSegmentsFromDetailedActivity(data: ActivityDetailed) {
    this._segments = [];
    data.segment_efforts.forEach((effort) => {
      if (this.main.segFile) {
        const seg = this.main.segFile.getSegment(effort.name);
        if (seg) {
          console.log('  Found starred segment', effort.name);
          this._addDetailSegment(effort);
        }
      }
    });
  }

  private _addDetailSegment(segEffort: Segment.Effort) {
    let name = String(segEffort.name).trim();
    const aliases = this.main.config.aliases;
    if (aliases && aliases[name]) {
      name = aliases[name];
      segEffort.name = name;
    }
    const sd: string = dateutil.formatMS(segEffort.elapsed_time * 1000, {
      ms: false,
      hours: true,
    });
    console.log(`  Adding segment '${name}, elapsed time ${sd}`);
    // Add segment to this activity
    this._segments.push(new Segment.Data(segEffort));
  }

  public include(filter: Activity.Filter) {
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

  public static compareStartDate(a: ActivityBase, b: ActivityBase) {
    if (a.startDate < b.startDate) {
      return -1;
    }
    if (a.startDate > b.startDate) {
      return 1;
    }
    return 0;
  }
}
