import { SegmentName } from './models/segment-base';
import { SegmentFile } from './segment-file';
import { SummarySegment } from './models/summary-segment';
import { StravaCreds } from './strava-creds';
import { Athelete } from './models/athlete';
import { Activity, ActivityFilter } from './models/activity';
import fs from 'fs';
import { StravaActivityOpts, StravaApi, StravaClientConfig, StravaStreamSource } from './strava-api';
import { Kml, LineStyle, KmlOpts } from './kml';
import { readJson, Dict, EpochSeconds, Metres, Seconds, writeJson } from './util';
import { Server } from './server';
import { Bikelog, BikelogOutputOpts, BikeDef } from './bikelog';
import { Segment } from './models/segment';
import { SegmentData } from './models/segment-data';

// let _ = require('underscore');
// let async = require('async');
// let dateutil = require('dateutil');
// let Strava = require('../lib/stravaV3api');
// let Bikelog = require('../lib/bikelog');

const REQ_LIMIT = 10;

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
  bikes?: BikeDef[];
  aliases?: Record<SegmentName, SegmentName>;
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
  refreshStarredSegments?: boolean;
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
  config: StravaConfig;
  strava: any;
  stravaCreds: StravaCreds;
  kml: Kml;
  athlete: Athelete;
  activities: Activity[];
  segments: SummarySegment[];
  segmentsFileLastModified: Date;
  segmentConfig: Record<string, any>;
  gear: any[];
  segmentEfforts: Record<string, any>;
  starredSegments: SegmentData[] = [];
  segFile: SegmentFile;

  constructor(options: MainOpts) {
    this.options = options;
    this.config = options.config;
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
        })
        .then(resp => {
          return this.strava.initCreds();
        });
    } else {
      return Promise.reject(new Error('No config file or config file does not contain client id and secret'));
    }
  }

  run(): Promise<void> {
    return this.init()
      .then(resp => {
        if (!this.strava.creds.areValid()) {
          console.log('Authorization required. Opening web authorization page');
          let authServer = new Server(this.strava);
          return authServer.run().then(resp => {
            console.log('Closing server');
            authServer.close();
          });
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
        this.segFile = new SegmentFile(this.options.segmentsFile, this.strava);
        return this.segFile.get({ refresh: this.options.refreshStarredSegments });
      })
      .then(resp => {
        if (this.options.kml && !this.options.activities && !this.options.segments) {
          throw new Error('When writing kml select either segments, activities or both');
        }
      })
      .then(resp => {
        if (this.options.athlete || this.options.xml) {
          return this.getAthlete().then(resp => {
            if (!this.options.xml) {
              this.logAthlete();
            }
          });
        }
      })
      .then(resp => {
        if (this.options.activities || this.options.xml) {
          return this.getActivities().then(resp => {
            this.activities = resp;
            console.log(`Found ${resp.length} Activities`);
            if (!this.options.xml) {
              resp.forEach(i => {
                console.log('  ' + i.toString());
              });
            }
          });
        }
      })
      .then(resp => {
        if (this.options.xml) {
          return this.addActivitiesDetails();
        }
      })
      .then(resp => {
        if (this.options.xml) {
          return this.saveXml();
        }
      })
      .then(resp => {
        if (this.options.kml && this.options.activities) {
          return this.addActivitiesCoordinates();
        }
      })
      .then(resp => {
        if (this.options.kml && this.options.segments) {
          return this.addStarredSegmentsCoordinates();
        }
      })
      .then(resp => {
        if (this.options.kml) {
          let opts = {
            activities: true,
            segments: this.options.segments ? true : false
          };
          return this.saveKml(opts);
        }
      });
  }

  getAthlete(): Promise<void> {
    return this.strava
      .getAthlete(this.options.athleteId)
      .then(resp => {
        this.athlete = resp;
      })
      .catch(err => {
        err.message = 'Athlete ' + err.message;
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
        results = this.filterActivities(results);
        results = results.sort(Activity.compareStartDate);
        return Promise.resolve(results);
      });
  }

  getActivitiesForDateRange(dateRange: DateRange, page: number = 1): Promise<Activity[]> {
    let page_size: number = 200;
    let params: StravaActivityOpts = {
      athleteId: this.options.athleteId,
      query: {
        per_page: page_size,
        after: dateRange.after,
        before: dateRange.before,
	page: page
      }
    };
    return this.strava.getActivities(params).then(resp => {
      let activities = resp as Activity[];
      let results: Activity[] = [];
      resp.forEach(data => {
        let activity = Activity.newFromResponseData(data, this);
        if (activity) {
          results.push(activity);
        }
      });
      if(activities.length < page_size) {
          return Promise.resolve(results);
      } else {
          return this.getActivitiesForDateRange(dateRange, page + 1).then(tail_results => {
              return Promise.resolve(results.concat(tail_results));
          });
      }
    });
  }

  filterActivities(activities: Activity[]): Activity[] {
    let filter: ActivityFilter = {
      commuteOnly: this.options.commuteOnly,
      nonCommuteOnly: this.options.nonCommuteOnly,
      include: this.options.activityFilter
    };
    let results: Activity[] = activities.filter(activity => {
      return activity.include(filter);
    });
    return results;
  }

  /**
   * Read more information using the DetailedActivity object and add these
   * details to the Activity object.
   */
  addActivitiesDetails(): Promise<any> {
    console.log(`Retrieving activity details for ${this.activities.length} Activities`);

    // Break into chunks to limit to REQ_LIMIT parallel requests.
    let activitiesChunks = [];
    for (let idx = 0; idx < this.activities.length; idx += REQ_LIMIT) {
      const tmpArray = this.activities.slice(idx, idx + REQ_LIMIT);
      activitiesChunks.push(tmpArray);
    }

    return activitiesChunks
      .reduce((promiseChain, activities) => {
        return promiseChain.then(() => {
          let jobs = [];
          activities.forEach(activity => {
            let job = this.addActivityDetail(activity);
            jobs.push(job);
          });
          return Promise.all(jobs);
        });
      }, Promise.resolve())
      .then(resp => {
        return Promise.resolve();
      });
  }

  addActivityDetail(activity: Activity): Promise<void> {
    return this.strava.getDetailedActivity(activity).then(data => {
      activity.addFromDetailedActivity(data);
    });
  }

  /**
   * Add coordinates for the activity or segment. Limits to REQ_LIMIT parallel requests.
   */
  addActivitiesCoordinates() {
    console.log(`Retrieving coordinates for ${this.activities.length} Activities`);

    // Break into chunks to limit to REQ_LIMIT parallel requests.
    let activitiesChunks = [];
    for (let idx = 0; idx < this.activities.length; idx += REQ_LIMIT) {
      const tmpArray = this.activities.slice(idx, idx + REQ_LIMIT);
      activitiesChunks.push(tmpArray);
    }

    return activitiesChunks
      .reduce((promiseChain, items) => {
        return promiseChain.then(() => {
          let jobs = [];
          items.forEach(item => {
            let name = item.start_date_local;
            let job = this.strava.getStreamCoords(StravaStreamSource.activities, item.id, name).then(resp => {
              item._coordinates = resp;
            });
            jobs.push(job);
          });
          return Promise.all(jobs);
        });
      }, Promise.resolve())
      .then(resp => {
        return Promise.resolve();
      });
  }

  /**
   * Call only when generating KML file with all segments
   */
  addStarredSegmentsCoordinates() {
    console.log(`Retrieving coordinates for ${this.starredSegments.length} Starred Segments`);

    return this.starredSegments
      .reduce((promiseChain, item) => {
        return promiseChain.then(() => {
          return this.strava.getStreamCoords(StravaStreamSource.segments, item.id, item.name).then(resp => {
            item.coordinates = resp;
          });
        });
      }, Promise.resolve())
      .then(resp => {
        return Promise.resolve();
      });
  }

  saveXml() {
    let opts: BikelogOutputOpts = {
      more: this.options.more,
      dates: this.options.dateRanges,
      imperial: this.options.imperial,
      bikes: this.options.config.bikes
    };
    if (this.options.segments === 'flat') {
      opts.segmentsFlatFolder = true;
    }
    let bikelog = new Bikelog(opts);
    return bikelog.outputData(this.options.xml, this.activities, this.athlete.bikes);
  }

  saveKml(options: { activities?: boolean; segments?: boolean } = {}) {
    let opts: KmlOpts = {
      more: this.options.more,
      dates: this.options.dateRanges,
      imperial: this.options.imperial,
      activities: options.activities,
      segments: options.segments
    };
    if (this.options.segments === 'flat') {
      opts.segmentsFlatFolder = true;
    }
    let kml = new Kml(opts);
    return kml.outputData(this.options.kml, this.activities, this.starredSegments);
  }
}
