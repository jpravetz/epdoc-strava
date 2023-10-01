import { Dict } from 'epdoc-util';
import { Bikelog, BikelogOutputOpts } from './bikelog';
import { Kml, KmlOpts } from './kml';
import { Activity, ActivityFilter } from './models/activity';
import { Athelete, StravaBike } from './models/athlete';
import { SegmentData } from './models/segment-data';
import { SummarySegment } from './models/summary-segment';
import { SegmentFile } from './segment-file';
import { Server } from './server';
import { StravaActivityOpts, StravaApi, StravaStreamSource, isStravaClientSecret } from './strava-api';
import { StravaConfig } from './strava-config';
import { EpochSeconds, LogFunction, LogFunctions } from './util';

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
  selectedBikes?: string[];
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
  log?: LogFunctions;
};

export class Main {
  private options: MainOpts;
  private _config: StravaConfig;
  private strava: any;
  private kml: Kml;
  private athlete: Athelete;
  private activities: Activity[];
  private segments: SummarySegment[];
  private segmentsFileLastModified: Date;
  private segmentConfig: Record<string, any>;
  private gear: any[];
  private segmentEfforts: Record<string, any>;
  private starredSegments: SegmentData[] = [];
  public segFile: SegmentFile;
  public bikes: Dict = {};
  private _log: LogFunctions;

  constructor(options: MainOpts) {
    this.options = options;
    this._config = options.config;
    this._log = options.log
      ? options.log
      : { info: (msg) => {}, debug: (msg) => {}, error: (msg) => {}, warn: (msg) => {}, verbose: (msg) => {} };
  }

  public async init(): Promise<void> {
    if (isStravaClientSecret(this.config.client)) {
      this.strava = new StravaApi(this.config.client, this.config.credentials, this.options);
      return Promise.resolve()
        .then((resp) => {
          if (this.options.kml) {
            // Run this first to validate line styles before pinging strava APIs
            this.kml = new Kml({ log: this.log });
            if (this.options.config.lineStyles) {
              this.kml.setLineStyles(this.options.config.lineStyles);
            }
          }
        })
        .then((resp) => {
          return this.strava.initCreds();
        });
    } else {
      return Promise.reject(new Error('Config does not contain client id and secret'));
    }
  }

  public get config(): StravaConfig {
    return this._config;
  }

  public get log(): LogFunctions {
    return this._log;
  }

  public async auth(): Promise<void> {
    return this.init()
      .then((resp) => {
        if (!this.strava.creds.areValid()) {
          this._log.info('Authorization required. Opening web authorization page');
          const authServer = new Server(this.strava, { log: this.options.log });
          return authServer.run().then((resp) => {
            this._log.info('Closing server');
            authServer.close();
          });
        } else {
          this._log.info('Authorization not required');
        }
      })
      .then((resp) => {
        if (!this.strava.creds.areValid()) {
          throw new Error('Invalid credentials');
        }
      });
  }

  public async run(): Promise<void> {
    return this.auth()
      .then((resp) => {
        this.segFile = new SegmentFile(this.options.segmentsFile, this.strava, { log: this._log });
        return this.segFile.get({ refresh: this.options.refreshStarredSegments });
      })
      .then((resp) => {
        if (this.options.kml && !this.options.activities && !this.options.segments) {
          throw new Error('When writing kml select either segments, activities or both');
        }
      })
      .then((resp) => {
        if (this.options.athlete || this.options.xml || this.options.kml) {
          return this.getAthlete().then((resp) => {
            if (!this.options.xml) {
              this.logAthlete();
            }
          });
        }
      })
      .then((resp) => {
        if (this.options.activities || this.options.xml) {
          return this.getActivities().then((resp) => {
            this.activities = resp;
            this._log.info(`Found ${resp.length} Activities`);
            if (!this.options.xml) {
              resp.forEach((i) => {
                this._log.info('  ' + i.toString());
              });
            }
          });
        }
      })
      .then((resp) => {
        if (this.options.xml) {
          return this.addActivitiesDetails();
        }
      })
      .then((resp) => {
        if (this.options.xml) {
          return this.saveXml();
        }
      })
      .then((resp) => {
        if (this.options.kml && this.options.activities) {
          return this.addActivitiesCoordinates();
        }
      })
      .then((resp) => {
        if (this.options.kml && this.options.segments) {
          return this.addStarredSegmentsCoordinates();
        }
      })
      .then((resp) => {
        if (this.options.kml) {
          let opts = {
            activities: true,
            segments: this.options.segments ? true : false,
          };
          return this.saveKml(opts);
        }
      });
  }

  public async getAthlete(): Promise<void> {
    return this.strava
      .getAthlete(this.options.athleteId)
      .then((resp) => {
        this.athlete = resp;
        this.registerBikes(this.athlete.bikes);
      })
      .catch((err) => {
        err.message = 'Athlete ' + err.message;
        throw err;
      });
  }

  public logAthlete() {
    this._log.info('Athlete ' + JSON.stringify(this.athlete, null, '  '));
  }

  public async getActivities(): Promise<Activity[]> {
    let results: Activity[] = [];
    const dateRanges: DateRange[] = Array.isArray(this.options.dates) ? this.options.dates : [];

    return dateRanges
      .reduce((promiseChain, dateRange) => {
        return promiseChain.then(() => {
          let job = this.getActivitiesForDateRange(dateRange).then((resp) => {
            results = results.concat(resp);
          });
          return job;
        });
      }, Promise.resolve())
      .then((resp) => {
        results = this.filterActivities(results);
        results = results.sort(Activity.compareStartDate);
        return Promise.resolve(results);
      });
  }

  public async getActivitiesForDateRange(dateRange: DateRange): Promise<Activity[]> {
    const params: StravaActivityOpts = {
      athleteId: this.options.athleteId,
      query: {
        per_page: 200,
        after: dateRange.after,
        before: dateRange.before,
      },
    };
    return this.strava.getActivities(params).then((resp) => {
      const activities = resp as Dict[];
      const results: Activity[] = [];
      resp.forEach((data) => {
        const activity = Activity.newFromResponseData(data, this);
        if (activity) {
          results.push(activity);
        }
      });
      return Promise.resolve(results);
    });
  }

  public filterActivities(activities: Activity[]): Activity[] {
    const filter: ActivityFilter = {
      commuteOnly: this.options.commuteOnly,
      nonCommuteOnly: this.options.nonCommuteOnly,
      include: this.options.activityFilter,
    };
    const results: Activity[] = activities.filter((activity) => {
      return activity.include(filter);
    });
    return results;
  }

  /**
   * Read more information using the DetailedActivity object and add these
   * details to the Activity object.
   */
  public async addActivitiesDetails(): Promise<any> {
    this._log.info(`Retrieving activity details for ${this.activities.length} Activities`);

    // Break into chunks to limit to REQ_LIMIT parallel requests.
    const activitiesChunks = [];
    for (let idx = 0; idx < this.activities.length; idx += REQ_LIMIT) {
      const tmpArray = this.activities.slice(idx, idx + REQ_LIMIT);
      activitiesChunks.push(tmpArray);
    }

    return activitiesChunks
      .reduce((promiseChain, activities) => {
        return promiseChain.then(() => {
          const jobs = [];
          activities.forEach((activity) => {
            const job = this.addActivityDetail(activity);
            jobs.push(job);
          });
          return Promise.all(jobs);
        });
      }, Promise.resolve())
      .then((resp) => {
        return Promise.resolve();
      });
  }

  public async addActivityDetail(activity: Activity): Promise<void> {
    return this.strava.getDetailedActivity(activity).then((data) => {
      activity.addFromDetailedActivity(data);
    });
  }

  /**
   * Add coordinates for the activity or segment. Limits to REQ_LIMIT parallel requests.
   */
  private addActivitiesCoordinates() {
    this._log.info(`Retrieving coordinates for ${this.activities.length} Activities`);

    // Break into chunks to limit to REQ_LIMIT parallel requests.
    const activitiesChunks = [];
    for (let idx = 0; idx < this.activities.length; idx += REQ_LIMIT) {
      const tmpArray = this.activities.slice(idx, idx + REQ_LIMIT);
      activitiesChunks.push(tmpArray);
    }

    return activitiesChunks
      .reduce((promiseChain, items) => {
        return promiseChain.then(() => {
          const jobs = [];
          items.forEach((item) => {
            const activity: Activity = item as Activity;
            const name = activity.startDateLocal;
            const job = this.strava.getStreamCoords(StravaStreamSource.activities, activity.id, name).then((resp) => {
              activity.coordinates = resp;
            });
            jobs.push(job);
          });
          return Promise.all(jobs);
        });
      }, Promise.resolve())
      .then((resp) => {
        return Promise.resolve();
      });
  }

  /**
   * Call only when generating KML file with all segments
   */
  private async addStarredSegmentsCoordinates() {
    this._log.info(`Retrieving coordinates for ${this.starredSegments.length} Starred Segments`);

    return this.starredSegments
      .reduce((promiseChain, item) => {
        return promiseChain.then(() => {
          return this.strava.getStreamCoords(StravaStreamSource.segments, item.id, item.name).then((resp) => {
            item.coordinates = resp;
          });
        });
      }, Promise.resolve())
      .then((resp) => {
        return Promise.resolve();
      });
  }

  private registerBikes(bikes: StravaBike[]) {
    if (bikes && bikes.length) {
      bikes.forEach((bike) => {
        this.bikes[bike.id] = bike;
      });
    }
  }

  private saveXml() {
    const opts: BikelogOutputOpts = {
      more: this.options.more,
      dates: this.options.dateRanges,
      imperial: this.options.imperial,
      selectedBikes: this.options.config.bikes,
      bikes: this.bikes,
      log: this.log,
    };
    if (this.options.segments === 'flat') {
      opts.segmentsFlatFolder = true;
    }
    const bikelog = new Bikelog(opts);
    return bikelog.outputData(this.options.xml, this.activities);
  }

  private saveKml(options: { activities?: boolean; segments?: boolean } = {}) {
    const opts: KmlOpts = {
      more: this.options.more,
      dates: this.options.dateRanges,
      imperial: this.options.imperial,
      activities: options.activities,
      segments: options.segments,
      bikes: this.bikes,
      log: this.log,
    };
    if (this.options.segments === 'flat') {
      opts.segmentsFlatFolder = true;
    }
    const kml = new Kml(opts);
    return kml.outputData(this.options.kml, this.activities, this.starredSegments);
  }
}
