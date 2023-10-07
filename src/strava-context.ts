import { Dict, Integer } from 'epdoc-util';
import { DetailedAthlete, RefreshTokenRequest, RefreshTokenResponse, Strava, SummarySegment } from 'strava';
import { BasicStravaConfig } from './basic-strava-config';
import { Activity } from './joins/activity';
// import { AthleteID } from './models';
// import { Athlete, StravaBike } from './models/athlete';
// import { GearID } from './models/detailedGear';
// import { RefreshOpts, SegmentCacheDict, SegmentCacheFile } from './segment-cache-file';
// import { Server, ServerOpts } from './server';
// import { StravaActivityOpts, StravaApi, StravaStreamSource } from './strava-api';
import { Server, ServerOpts } from './server';
import { StravaConfig } from './strava-config';
import { LogFunctions, RefreshOpts, Seconds } from './types';

const REQ_LIMIT = 10;
const REQ_PAGE_PER_PAGE_LIMIT: Integer = 200;
const ACCESS_TOKEN_MIN_LIFESPAN: Seconds = 2 * 60 * 60;

type ReqPageOpts = {
  page?: Integer;
  per_page?: Integer;
};

export function newStravaContext(config: StravaConfig, opts: ServerOpts): StravaContext {
  return new StravaContext(config, opts);
}

/**
 * Strava Context object to hold any context needed during a session. There is a
 * context per athlete.
 */
export class StravaContext {
  public api_deprecated: null;
  strava: Strava;
  config: BasicStravaConfig;

  public bikes: Dict = {};
  public activities: Activity[];
  public athlete: DetailedAthlete;
  // public summarySegments: Dict[];
  public aliases: Dict; // XXXX
  private _log: LogFunctions;
  private _serverOpts: ServerOpts;
  x: RefreshTokenRequest;

  constructor(config: BasicStravaConfig, opts: ServerOpts) {
    // this.api = new StravaApi(client, credentials, opts);
    this.config = config;
    this._log = opts.log;
    this._serverOpts = opts;
  }

  initApi(): StravaContext {
    const request: RefreshTokenRequest = {
      client_id: String(this.config.clientId),
      client_secret: this.config.clientSecret,
      refresh_token: this.config.refreshToken,
      on_token_refresh: (res: RefreshTokenResponse) => {
        return this.config.updateCredentials(res);
      },
    };
    this.strava = new Strava(request);
    return this;
  }

  public async authorize() {
    return Promise.resolve()
      .then((resp) => {
        const authNeeded = !this.config.refreshToken;
        // const authNeeded = this.config.credentialsAreValid(ACCESS_TOKEN_MIN_LIFESPAN);
        if (authNeeded) {
          this._log.info('Authorization required. Opening web authorization page');
          const authServer = new Server(this.config, this._serverOpts);
          return authServer.run().then((resp) => {
            this._log.info('Closing server');
            authServer.close();
          });
        } else {
          this._log.info('Authorization not required');
        }
      })
      .then((resp) => {
        if (!this.config.credentialsAreValid(ACCESS_TOKEN_MIN_LIFESPAN)) {
          throw new Error('Invalid credentials');
        }
      });
  }

  public async getLoggedInAthlete(id: number): Promise<DetailedAthlete> {
    return this.strava.athletes
      .getLoggedInAthlete()
      .then((resp) => {
        this.athlete = resp;
        this.registerBikes(this.athlete.bikes);
        return Promise.resolve(this.athlete);
      })
      .catch((err) => {
        err.message = 'Athlete ' + err.message;
        throw err;
      });
  }

  private registerBikes(bikes: Dict[]) {
    if (bikes && bikes.length) {
      bikes.forEach((bike) => {
        this.bikes[bike.id] = bike;
      });
    }
  }

  // public async getGear(id: GearID): Promise<void> {
  //   return this.api_deprecated
  //     .getGear(id)
  //     .then((resp) => {
  //       // this.gear = Athlete.newFromResponseData(resp);
  //       return;
  //     })
  //     .catch((err) => {
  //       err.message = 'Gear ' + err.message;
  //       throw err;
  //     });
  // }

  // get cachedSegments(): SegmentCacheDict {
  //   return this.segCacheFile.segments;
  // }

  // public async getSegments(segCachPath: FilePath, opts: GetSegmentsOpts): Promise<void> {
  //   this.segCacheFile = new SegmentCacheFile(segCachPath, this.api_deprecated, {
  //     log: this._log,
  //   });
  //   return this.segCacheFile.get(opts);
  // }

  public async getLoggedInAthleteStarredSegments(opts: RefreshOpts = {}): Promise<SummarySegment[]> {
    if (opts.refresh || !this.config.summarySegmentsAreCached) {
      let result: SummarySegment[] = [];
      return this.accumulateLoggedInAthleteStarredSegments(result)
        .then((resp) => {
          return this.config.updateSummarySegmentCache(result);
        })
        .then((resp) => {
          return this.config.getSummarySegmentCache();
        });
    } else {
      return this.config.getSummarySegmentCache();
    }
  }

  private async accumulateLoggedInAthleteStarredSegments(
    accum: SummarySegment[],
    params: ReqPageOpts = {}
  ): Promise<void> {
    if (!params.per_page) {
      params.per_page = REQ_PAGE_PER_PAGE_LIMIT;
    }
    if (!params.page) {
      params.page = 1;
    }
    return this.strava.segments.getLoggedInAthleteStarredSegments(params).then((resp) => {
      accum.concat(resp);
      if (resp.length >= params.per_page) {
        params.page = params.page + 1;
        return this.accumulateLoggedInAthleteStarredSegments(accum, params);
      }
    });
  }

  public async clearActivities() {
    this.activities = [];
  }

  /**
   * Get activities within the date ranges for the logged-in user.
   * @param dateRanges
   * @param opts
   * @returns
   */
  // public async getActivities(dateRanges: DateRange[], opts: LogOpts): Promise<void> {
  //   let results: Activity[] = [];
  //   dateRanges = isArray(dateRanges) ? dateRanges : [dateRanges];

  //   return dateRanges
  //     .reduce((promiseChain, dateRange) => {
  //       return promiseChain.then(() => {
  //         let job = this.getActivitiesForDateRange(dateRange, opts).then((resp) => {
  //           results = results.concat(resp);
  //         });
  //         return job;
  //       });
  //     }, Promise.resolve())
  //     .then((resp) => {
  //       // results = this.filterActivities(results);
  //       this.activities = results.sort(Activity.compareStartDate);
  //     });
  // }

  // public async filterActivities(filter: ActivityFilter) {
  //   this.activities = this.activities.filter((activity) => {
  //     return activity.include(filter);
  //   });
  // }

  // private async getActivitiesForDateRange(dateRange: DateRange, opts: LogOpts): Promise<Activity[]> {
  //   const params: StravaActivityOpts = {
  //     athleteId: this.athlete.id,
  //     query: {
  //       per_page: 200,
  //       after: dateRange.after,
  //       before: dateRange.before,
  //     },
  //   };
  //   return this.api_deprecated.getActivities(params).then((resp) => {
  //     const activities = resp as Dict[];
  //     const results: Activity[] = [];
  //     const activityOpts: ActivityOpts = {
  //       log: opts.log,
  //       aliases: this.aliases,
  //       segCacheFile: this.segCacheFile,
  //     };
  //     resp.forEach((data) => {
  //       const activity = Activity.newFromResponseData(data, activityOpts);
  //       if (activity) {
  //         results.push(activity);
  //       }
  //     });
  //     return Promise.resolve(results);
  //   });
  // }

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

  private async addActivityDetail(activity: Activity): Promise<void> {
    return this.api_deprecated.getDetailedActivity(activity).then((data) => {
      activity.addFromDetailedActivity(data);
    });
  }

  /**
   * Add coordinates for the activity or segment. Limits to REQ_LIMIT parallel requests.
   */
  public async addActivitiesCoordinates() {
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
            const job = this.api_deprecated
              .getStreamCoords(StravaStreamSource.activities, activity.id, name)
              .then((resp) => {
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
    this._log.info(`Retrieving coordinates for ${this.segCacheFile.numSegments} Starred Segments`);

    // return this.cachedSegments
    //   .reduce((promiseChain, item) => {
    //     return promiseChain.then(() => {
    //       return this.api.getStreamCoords(StravaStreamSource.segments, item.id, item.name).then((resp) => {
    //         item.coordinates = resp;
    //       });
    //     });
    //   }, Promise.resolve())
    //   .then((resp) => {
    //     return Promise.resolve();
    //   });
  }
}
