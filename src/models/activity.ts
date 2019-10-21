import { MainOpts } from '../main';
export class Activity {
  keys: string[] = ['distance', 'total_elevation_gain', 'moving_time', 'elapsed_time', 'average_temp', 'device_name'];

  constructor(data) {
    Object.assign(this, data);
  }

  static newFromResponseData(data, opts: MainOpts): Activity {
    if (
      (!opts.commuteOnly && !opts.nonCommuteOnly) ||
      (opts.commuteOnly && data.commute) ||
      (opts.nonCommuteOnly && !data.commute)
    ) {
      if (opts.activityFilter.length) {
        if (opts.activityFilter.indexOf(data.type) >= 0) {
          return new Activity(data);
        }
      } else {
        return new Activity(data);
      }
    }
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
