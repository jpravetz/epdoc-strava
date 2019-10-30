import { StravaCoord } from './../strava-api';
import { DetailedActivity } from './detailed-activity';
import { Metres, IsoDateString } from './../util';
import { MainOpts, Main } from '../main';
import * as dateutil from 'dateutil';
import { pick, isString, isNumber, isBoolean } from 'epdoc-util';
import { SegmentEffort } from './segment-effort';
import { SegmentData } from './segment-data';

export type ActivityFilter = {
  commuteOnly?: boolean;
  nonCommuteOnly?: boolean;
  include?: string[];
  exclude?: string[];
};

export class Activity {
  keys: string[] = ['distance', 'total_elevation_gain', 'moving_time', 'elapsed_time', 'average_temp', 'device_name'];
  id: number;
  name: string;
  description: string;
  main: Main;
  commute: boolean;
  type: string;
  distance: Metres;
  startDate: Date;
  start_date: IsoDateString;
  start_date_local: IsoDateString;

  _asString: string;
  _segments: SegmentData[]; // list of starred segments for this Activity
  _coordinates: StravaCoord[]; // will contain the latlng coordinates for the activity

  constructor(data) {
    Object.assign(this, data);
    this.startDate = new Date(this.start_date);
    this._asString = `${this.start_date_local.slice(0, 10)}, ${Math.round(this.distance / 100) / 10} km, ${this.name}`;
  }

  static newFromResponseData(data, main: Main): Activity {
    let result = new Activity(data);
    result.main = main;
    return result;
  }

  static isInstance(val: any): val is Activity {
    return val && isNumber(val.id) && isBoolean(val.commute);
  }

  toString() {
    return this._asString;
  }

  /**
   * Get starred segment_efforts and descriptions from the DetailedActivity
   * object and add to Acivity.
   * @param data
   */
  addFromDetailedActivity(data: DetailedActivity) {
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

  _addDescriptionFromDetailedActivity(data: DetailedActivity): void {
    if (isString(data.description)) {
      let p: string[] = data.description.split(/\r\n/);
      //console.log(p)
      if (p && p.length) {
        let a = [];
        p.forEach(line => {
          let kv = line.match(/^([^\s\=]+)\s*=\s*(.*)+$/);
          //console.log(kv)
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

  _addDetailSegmentsFromDetailedActivity(data: DetailedActivity) {
    this._segments = [];
    data.segment_efforts.forEach(effort => {
      // @ts-ignore
      if (Array.isArray(this.main.starredSegment) && this.main.starredSegment.indexOf(effort.name) >= 0) {
        this._addDetailSegment(effort);
      }
    });
  }

  _addDetailSegment(segEffort: SegmentEffort) {
    let name = String(segEffort.name).trim();
    if (this.main.segmentConfig && this.main.segmentConfig.alias && this.main.segmentConfig.alias[name]) {
      name = this.main.segmentConfig.alias[name];
      segEffort.name = name;
    }
    console.log(
      "  Adding segment '" +
        name +
        "', elapsed time " +
        dateutil.formatMS(segEffort.elapsed_time * 1000, {
          ms: false,
          hours: true
        })
    );
    // Add segment to this activity
    this._segments.push(new SegmentData(segEffort));
  }

  include(filter: ActivityFilter) {
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

  static compareStartDate(a, b) {
    if (a.start_date < b.start_date) {
      return -1;
    }
    if (a.start_date > b.start_date) {
      return 1;
    }
    return 0;
  }
}