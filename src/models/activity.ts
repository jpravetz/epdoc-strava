import { MainOpts, Main } from '../main';
import { EpochSeconds, Dict } from '../util';

export type ActivityData = Dict;

export type ActivityFilter = {
  commuteOnly?: boolean;
  nonCommuteOnly?: boolean;
  include?: string[];
  exclude?: string[];
};

export class Activity {
  keys: string[] = ['distance', 'total_elevation_gain', 'moving_time', 'elapsed_time', 'average_temp', 'device_name'];
  id: number;
  start_date_local: EpochSeconds;
  name: string;
  description: string;
  segments: string[];
  main: Main;
  commute: boolean;
  type: string;

  constructor(data) {
    Object.assign(this, data);
  }

  static newFromResponseData(data, opts: MainOpts): Activity {
    if (
      (!opts.commuteOnly && !opts.nonCommuteOnly) ||
      (opts.commuteOnly && data.commute) ||
      (opts.nonCommuteOnly && !data.commute)
    ) {
      if (opts.activityFilter && Array.isArray(opts.activityFilter)) {
        if (opts.activityFilter.indexOf(data.type) >= 0) {
          return new Activity(data);
        }
      } else {
        return new Activity(data);
      }
    }
  }

  addDetailFromActivityData(data: ActivityData) {
    console.log('  Adding activity details for ' + this.start_date_local + ' ' + this.name);
    // console.log(data);
    if (data && data.segment_efforts && data.segment_efforts.length) {
      this.addDescription(data);
      return this.addDetailSegments(data);
    } else if (data && data.description) {
      this.addDescription(data);
    }
  }

  addDescription(data: ActivityData): void {
    let p = data.description.split(/\r\n/);
    //console.log(p)
    if (p) {
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
        this.keys.push('description');
      }
    } else {
      this.description = data.description;
      this.keys.push('description');
    }
  }

  addDetailSegments(data: ActivityData) {
    let ignore = [];
    this.segments = [];
    data.segment_efforts.forEach(segment => {
      if (Array.isArray(this.main.starredSegment) && this.main.starredSegment.indexOf(segment.name) >= 0) {
        this.addDetailSegment(segment);
      }
    });
  }

  addDetailSegment(segment: Dict) {
    let name = String(segment.name).trim();
    if (this.main.segmentConfig && this.main.segmentConfig.alias && this.main.segmentConfig.alias[name]) {
      name = this.main.segmentConfig.alias[name];
      segment.name = name;
    }
    console.log(
      "  Adding segment '" +
        name +
        "', elapsed time " +
        dateutil.formatMS(segment.elapsed_time * 1000, {
          ms: false,
          hours: true
        })
    );
    // Add segment to this activity
    this.segments.push(_.pick(segment, 'id', 'name', 'elapsed_time', 'moving_time', 'distance'));
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
