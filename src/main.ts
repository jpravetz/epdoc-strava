import { StravaCreds } from './strava-creds';
import { Athelete } from './models/athlete';
import { Activity } from './models/activity';
import fs from 'fs';
import { StravaActivityOpts, StravaApi, StravaApiOpts, StravaSecret, StravaClientConfig } from './strava-api';
import { Kml, LineStyle } from './kml';
import { readJson, Dict, EpochSeconds } from './util/file';
import { Server } from './server';
// let _ = require('underscore');
// let async = require('async');
// let dateutil = require('dateutil');
// let Strava = require('../lib/stravaV3api');
// let Bikelog = require('../lib/bikelog');

export type SegmentConfig = {
  description: string;
  alias: Dict;
  data: Dict;
};

export type StravaConfig = {
  description: string;
  client: StravaClientConfig;
  athleteId?: number;
  // accessToken: string;
  cachePath?: string;
  lineStyles?: Record<string, LineStyle>;
};

export type DateRange = {
  before: EpochSeconds;
  after: EpochSeconds;
};

export type MainOpts = {
  home: string;
  cwd: string;
  config?: StravaConfig;
  auth?: boolean;
  segmentsFile?: string;
  credentialsFile?: string;
  athlete?: string;
  athleteId?: number;
  bikes?: string[];
  friends?: string[];
  dates?: DateRange[];
  dateRanges?: DateRange[];
  more?: boolean;
  kml?: string;
  xml?: string;
  activities?: string[];
  activityFilter?: string[];
  commuteOnly?: boolean;
  nonCommuteOnly?: boolean;
  imperial?: boolean;
  segments?: boolean | string;
  verbose?: number;
};

export class Main {
  options: MainOpts;
  strava: any;
  stravaCreds: StravaCreds;
  kml: Kml;
  athlete: Athelete;
  activities: any[];
  segments: any[];
  segmentsFileLastModified: Date;
  segmentConfig: Record<string, any>;
  gear: any[];
  segmentEfforts: Record<string, any>;
  starredSegment: [];

  constructor(options: MainOpts) {
    this.options = options;
  }

  init(): Promise<void> {
    if (this.options.config && this.options.config.client) {
      this.strava = new StravaApi(this.options.config.client, this.options.credentialsFile);
      return Promise.resolve()
        .then(resp => {
          if (this.options.kml) {
            // Run this first to validate line styles before pinging strava APIs
            this.kml = new Kml({ verbose: this.options.verbose });
            if (this.options.config.lineStyles) {
              this.kml.setLineStyles(this.options.config.lineStyles);
            }
          }

          if (this.options.segmentsFile) {
            return this.readSegmentsFile(this.options.segmentsFile);
          } else {
            return Promise.resolve();
          }
        })
        .then(resp => {
          return this.strava.initCreds();
        });
    } else {
      return Promise.reject(new Error('No config file specified'));
    }
  }

  run(): Promise<void> {
    return this.init()
      .then(resp => {
        if (!this.strava.creds.areValid()) {
          console.log('Authorization required. Opening web authorization page');
          let authServer = new Server(this.strava);
          return authServer.run();
        } else {
          console.log('Authorization not required');
        }
      })
      .then(resp => {
        if (!this.strava.creds.areValid()) {
          throw new Error('Invalid credentials');
        }
      })
      .then(resp => {
        if (this.options.kml && !this.options.activities && !this.options.segments) {
          throw new Error('When writing kml select either segments, activities or both');
        }
      })
      .then(resp => {
        if (this.options.athlete) {
          return this.getAthlete().then(resp => {
            this.logAthlete();
          });
        }
      })
      .then(resp => {
        if (this.options.activities) {
          return this.getActivities().then(resp => {
            console.log('Activities', JSON.stringify(resp, null, '  '));
          });
        }
      });
  }

  readSegmentsFile(segmentsFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(segmentsFile)) {
        fs.stat(segmentsFile, (err, stats) => {
          if (err) {
            reject(err);
          } else {
            this.segmentsFileLastModified = stats.mtime;
            this.segmentConfig = readJson(segmentsFile);
            this.segmentConfig || (this.segmentConfig = {});
            this.segmentConfig.alias || (this.segmentConfig.alias = {});
            this.segmentConfig.data || (this.segmentConfig.data = {});
            resolve();
          }
        });
      } else {
        this.segmentConfig = { description: 'Strava segments', alias: {}, data: {} };
        resolve();
      }
    });
  }

  getAthlete(): Promise<void> {
    return this.strava
      .getAthlete(this.options.athleteId)
      .then(resp => {
        this.athlete = Athelete.newFromResponseData(resp);
      })
      .catch(err => {
        err.message = 'Athlete - ' + err.message;
        throw err;
      });
  }

  logAthlete() {
    console.log('Athlete', JSON.stringify(this.athlete, null, '  '));
  }

  getActivities(): Promise<Activity[]> {
    let results: Activity[] = [];
    let count = 0;
    let dateRanges: DateRange[] = Array.isArray(this.options.dates) ? this.options.dates : [];

    return dateRanges
      .reduce((promiseChain, dateRange) => {
        return promiseChain.then(() => {
          let job = this.getActivitiesForDateRange(dateRange).then(resp => {
            results = results.concat(resp);
          });
          return job;
        });
      }, Promise.resolve())
      .then(resp => {
        results = results.sort(Activity.compareStartDate);
        return Promise.resolve(results);
      });
  }

  getActivitiesForDateRange(dateRange: DateRange): Promise<Activity[]> {
    let params: StravaActivityOpts = {
      athleteId: this.options.athleteId,
      query: {
        per_page: 200,
        after: dateRange.after,
        before: dateRange.before
      }
    };
    return this.strava.getActivities(params).then(resp => {
      let activities = resp as Activity[];
      let results: Activity[] = [];
      resp.forEach(data => {
        let activity = Activity.newFromResponseData(data, this.options);
        if (activity) {
          results.push(activity);
        }
      });
      return Promise.resolve(results);
    });
  }
}
