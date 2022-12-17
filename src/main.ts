import { BikeDef, Bikelog, BikelogOutputOpts } from './bikelog';
import { Kml, KmlOpts, LineStyle } from './kml';
import { Activity, ActivityFilter } from './models/activity';
import { Athelete, StravaBike } from './models/athlete';
import { SegmentName } from './models/segment-base';
import { SegmentData } from './models/segment-data';
import { SummarySegment } from './models/summary-segment';
import { SegmentFile } from './segment-file';
import { Server } from './server';
import { StravaActivityOpts, StravaApi, StravaClientConfig, StravaStreamSource } from './strava-api';
import { StravaCreds } from './strava-creds';
import { Dict, EpochSeconds } from './util';

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
};

export class Main {
  private options: MainOpts;
  private _config: StravaConfig;
  private strava: any;
  private stravaCreds: StravaCreds;
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

  constructor(options: MainOpts) {
    this.options = options;
    this._config = options.config;
  }

  public async init(): Promise<void> {
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

  public get config(): StravaConfig {
    return this._config;
  }

  public run(): Promise<void> {
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

  public getAthlete(): Promise<void> {
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

  public logAthlete() {
    console.log('Athlete', JSON.stringify(this.athlete, null, '  '));
  }

  public getActivities(): Promise<Activity[]> {
    let results: Activity[] = [];
    const dateRanges: DateRange[] = Array.isArray(this.options.dates) ? this.options.dates : [];

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

  public getActivitiesForDateRange(dateRange: DateRange): Promise<Activity[]> {
    const params: StravaActivityOpts = {
      athleteId: this.options.athleteId,
      query: {
        per_page: 200,
        after: dateRange.after,
        before: dateRange.before
      }
    };
    return this.strava.getActivities(params).then(resp => {
      const activities = resp as Dict[];
      const results: Activity[] = [];
      resp.forEach(data => {
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
      include: this.options.activityFilter
    };
    const results: Activity[] = activities.filter(activity => {
      return activity.include(filter);
    });
    return results;
  }

  /**
   * Read more information using the DetailedActivity object and add these
   * details to the Activity object.
   */
  public addActivitiesDetails(): Promise<any> {
    console.log(`Retrieving activity details for ${this.activities.length} Activities`);

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
          activities.forEach(activity => {
            const job = this.addActivityDetail(activity);
            jobs.push(job);
          });
          return Promise.all(jobs);
        });
      }, Promise.resolve())
      .then(resp => {
        return Promise.resolve();
      });
  }

  public addActivityDetail(activity: Activity): Promise<void> {
    return this.strava.getDetailedActivity(activity).then(data => {
      activity.addFromDetailedActivity(data);
    });
  }

  /**
   * Add coordinates for the activity or segment. Limits to REQ_LIMIT parallel requests.
   */
  private addActivitiesCoordinates() {
    console.log(`Retrieving coordinates for ${this.activities.length} Activities`);

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
          items.forEach(item => {
            const activity: Activity = item as Activity;
            const name = activity.startDateLocal;
            const job = this.strava.getStreamCoords(StravaStreamSource.activities, activity.id, name).then(resp => {
              activity.coordinates = resp;
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
  private async addStarredSegmentsCoordinates() {
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

  private registerBikes(bikes: StravaBike[]) {
    if (bikes && bikes.length) {
      bikes.forEach(bike => {
        this.bikes[bike.id] = bike;
      });
    }
  }

  private saveXml() {
    this.registerBikes(this.athlete.bikes);
    const opts: BikelogOutputOpts = {
      more: this.options.more,
      dates: this.options.dateRanges,
      imperial: this.options.imperial,
      selectedBikes: this.options.config.bikes,
      bikes: this.bikes
    };
    if (this.options.segments === 'flat') {
      opts.segmentsFlatFolder = true;
    }
    const bikelog = new Bikelog(opts);
    return bikelog.outputData(this.options.xml, this.activities);
  }

  private saveKml(options: { activities?: boolean; segments?: boolean } = {}) {
    this.registerBikes(this.athlete.bikes);
    const opts: KmlOpts = {
      more: this.options.more,
      dates: this.options.dateRanges,
      imperial: this.options.imperial,
      activities: options.activities,
      segments: options.segments,
      bikes: this.bikes
    };
    if (this.options.segments === 'flat') {
      opts.segmentsFlatFolder = true;
    }
    const kml = new Kml(opts);
    return kml.outputData(this.options.kml, this.activities, this.starredSegments);
  }
}
