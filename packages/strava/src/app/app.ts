import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import { assert } from '@std/assert/assert';
import { Kml, KmlOpts } from '../../kml/kml.ts';
import { Bikelog, BikelogOutputOpts } from '../bikelog/bikelog.ts';
import rawConfig from '../config.json' with { type: 'json' };
import type * as Ctx from '../context.ts';
import { Strava } from '../dep.ts';
import { Dict } from '../fmt.ts';
import { Activity, ActivityFilter } from '../models/activity.ts';
import { Athelete, StravaBike } from '../models/athlete.ts';
import { SegmentData } from '../segment/data.ts';
import { SegmentFile } from '../segment/file.ts';
import { SummarySegment } from '../segment/summary.ts';
import { Server } from '../server.ts';
import { StravaActivityOpts, StravaStreamSource } from '../strava-api.ts';
import { StravaCreds } from '../strava-creds.ts';
import * as App from './types.ts';

const home = Deno.env.get('HOME');
assert(home, 'Environment variable HOME is missing');
const config: App.ConfigFile = _.deepCopy(rawConfig, { replace: { home: home as string } }) as App.ConfigFile;

const REQ_LIMIT = 10;

export class Main {
  #api?: Strava.Api<Ctx.MsgBuilder, Ctx.Logger>;
  #user?: UserSettings;
  private options: App.Opts;
  private _config: App.StravaConfig;
  private strava: unknown;
  private stravaCreds: StravaCreds;
  private kml: Kml;
  #athleteId?: string;
  private athlete: Athelete;
  private activities: Activity[];
  private segments: SummarySegment[];
  private segmentsFileLastModified: Date;
  private segmentConfig: Record<string, unknown>;
  private gear: unknown[];
  private segmentEfforts: Record<string, unknown>;
  private starredSegments: SegmentData[] = [];
  public segFile: SegmentFile;
  public bikes: Dict = {};
  notifyOffline = false;

  constructor() {
    // this.options = options;
  }

  async initClient(): Promise<void> {
    const clientApp = await new FS.File(config.settings.clientAppFile).readJson<App.ClientApp>();
    assert(clientApp && clientApp.client, `Invalid app key file ${config.settings.clientAppFile}`);
    this.#api = new Strava.Api(this.options.config.client, new FS.File(config.settings.credentialsFile));
    this.#user = await new FS.File(config.settings.userSettingsFile).readJson<App.UserSettings>();

    return Promise.resolve()
      .then((resp) => {
        if (this.options.kml) {
          // Run this first to validate line styles before pinging strava APIs
          this.kml = new Kml({ verbose: this.options.verbose });
          if (this.options.config.lineStyles) {
            this.kml.setLineStyles(this.options.config.lineStyles);
          }
        }
      })
      .then((resp) => {
        return this.strava.initCreds();
      });
  }

  setAthleteId(id: string): Promise<void> {
    this.#athleteId = id;
    return Promise.resolve();
  }

  async init(): Promise<void> {
  }

  async initAuth(ctx: Ctx.Context): Promise<void> {
    const creds = new Strava.Creds(new FS.File(config.settings.credentialsFile));
    await creds.read();
    if (!creds.isValid()) {
      ctx.log.info.h2('Authorization required. Opening web authorization page').emit();
      await this.#api!.auth(ctx);
      const authServer = new Server(this.strava);
      await authServer.run();
      ctx.log.info.h2('Closing server').emit();
      authServer.close();
    } else {
      console.log('Authorization not required');
    }
  }

  public async run(): Promise<void> {
    return this.init()
      .then((resp) => {
        if (!this.strava.creds.isValid()) {
          console.log('Authorization required. Opening web authorization page');
          const authServer = new Server(this.strava);
          return authServer.run().then((resp) => {
            console.log('Closing server');
            authServer.close();
          });
        } else {
          console.log('Authorization not required');
        }
      })
      .then((resp) => {
        if (!this.strava.creds.isValid()) {
          throw new Error('Invalid credentials');
        }
      })
      .then((resp) => {
        this.segFile = new SegmentFile(this.options.segmentsFile, this.strava);
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
            console.log(`Found ${resp.length} Activities`);
            if (!this.options.xml) {
              resp.forEach((i) => {
                console.log('  ' + i.toString());
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
    console.log('Athlete', JSON.stringify(this.athlete, null, '  '));
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
      activities.forEach((data) => {
        const activity = Activity.newFromResponseData(data, this);
        if (activity) {
          results.push(activity);
        }
      });
      return results;
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
  public async addActivitiesDetails(): Promise<unknown> {
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
          items.forEach((item) => {
            const activity: Activity = item as Activity;
            const name = activity.startDateLocal;
            const job = this.strava.getStreamCoords(StravaStreamSource.activities, activity.id, name).then(
              (resp) => {
                activity.coordinates = resp;
              },
            );
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
    console.log(`Retrieving coordinates for ${this.starredSegments.length} Starred Segments`);

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
    };
    if (this.options.segments === 'flat') {
      opts.segmentsFlatFolder = true;
    }
    const kml = new Kml(opts);
    return kml.outputData(this.options.kml, this.activities, this.starredSegments);
  }

  checkInternetAccess(_ctx: Ctx.Context): Promise<boolean> {
    return Promise.resolve(true);
  }
}
