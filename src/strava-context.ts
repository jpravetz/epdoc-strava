import { Dict, Integer, isArray, isPosInteger, omit } from 'epdoc-util';
import { DetailedAthlete, RefreshTokenRequest, Strava, SummaryActivity, SummarySegment } from 'strava';
import { BasicStravaConfig } from './basic-strava-config';
import { Activity } from './joins/activity';
import { Server, ServerOpts, TokenExchangeResponse, isTokenExchangeResponse } from './server';
import { StravaConfig } from './strava-config';
import { EpochSeconds, LogFunctions, RefreshOpts, Seconds, StravaAccessToken } from './types';

const REQ_LIMIT = 10;
const REQ_PAGE_PER_PAGE_LIMIT: Integer = 200;
const ACCESS_TOKEN_MIN_LIFESPAN: Seconds = 2 * 60 * 60;

type ReqPageOpts = {
  page?: Integer;
  per_page?: Integer;
};
type ReqDateRange = {
  before?: EpochSeconds;
  after?: EpochSeconds;
};
type ReqActivitiesOpts = ReqPageOpts &
  ReqDateRange & {
    details?: boolean;
  };

export function newStravaContext(config: StravaConfig, opts: ServerOpts): StravaContext {
  return new StravaContext(config, opts);
}

/**
 * Strava Context object to hold any context needed during a session. There is a
 * context per athlete.
 */
export class StravaContext {
  strava: Strava;
  config: BasicStravaConfig;

  public bikes: Dict = {};
  public activities: Activity[];
  public athlete: DetailedAthlete;
  public aliases: Dict; // XXXX
  private _log: LogFunctions;
  private _serverOpts: ServerOpts;

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
      on_token_refresh: (resp: TokenExchangeResponse) => {
        if (isTokenExchangeResponse(resp)) {
          return this.config.updateCredentials(resp);
        } else {
          return Promise.reject(new Error('Invalid token exchange response: ' + JSON.stringify(resp)));
        }
      },
    };
    this.strava = new Strava(request);
    return this;
  }

  get accessToken(): StravaAccessToken {
    return this.config.accessToken;
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

  public clearActivities() {
    this.activities = [];
    return this;
  }

  public async getLoggedInAthleteActivities(params: ReqActivitiesOpts = {}): Promise<Activity[]> {
    let queryParams: ReqPageOpts & ReqDateRange = omit(params, 'details');
    let bRecurse = false;
    if (!isPosInteger(queryParams.per_page)) {
      queryParams.per_page = REQ_PAGE_PER_PAGE_LIMIT;
    }
    if (!isPosInteger(queryParams.page)) {
      queryParams.page = 1;
      bRecurse = true;
    }
    let bStillMore = true;
    let accum: SummaryActivity[] = [];
    this.clearActivities();
    while (bStillMore) {
      await this.strava.activities.getLoggedInAthleteActivities(queryParams).then((resp) => {
        if (isArray(resp)) {
          resp.forEach((summary) => {
            let activity = new Activity(summary, this.config, { log: this._log });
            this.activities.push(activity);
          });
          if (resp.length < queryParams.per_page || !bRecurse) {
            bStillMore = false;
          } else {
            queryParams.page = queryParams.page + 1;
          }
        } else {
          throw new Error('Invalid response from getLoggedInAthleteActivities');
        }
      });
    }
    if (params.details) {
      this.addActivitiesDetails();
    }
    return Promise.resolve(this.activities);
  }

  /**
   * For all entries in the activities array, retrieve the DetailedActivity
   * object and upgrade the activity from a SummaryActivity to a
   * DetailedActivity. Throttled to REQ_LIMIT parallel requests.
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

  private async addActivityDetail(activity: Activity, includeAllEfforts: boolean = false): Promise<void> {
    return this.strava.activities
      .getActivityById({ id: activity.id, include_all_efforts: includeAllEfforts })
      .then((resp) => {
        activity.addDetails(resp);
      });
  }

  /**
   * Add coordinates for the activity or segment. Throttled to REQ_LIMIT parallel requests.
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
            const job = this.strava.streams
              .getActivityStreams({ id: item.id, keys: 'latlng' }, this.accessToken)
              .then((resp) => {
                // @ts-ignore XXX
                activity.coordinates = resp.latlng;
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

  public async getSummarySegmentCache(): Promise<SummarySegment[]> {
    return this.config.getSummarySegmentCache();
  }

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

  /**
   * Call only when generating KML file with all segments
   */
  private async addStarredSegmentsCoordinates() {
    return this.getSummarySegmentCache().then((resp) => {
      let summarySegments: SummarySegment[] = resp as SummarySegment[];
      this._log.info(`Retrieving coordinates for ${summarySegments.length} Starred Segments`);
      const jobs = [];
      // return summarySegments
      //   .reduce((promiseChain, item) => {
      //     // const job = return promiseChain.then((resp) => {
      //     //   return this.strava.streams.getSegmentStreams({id:item.id,keys:'latlng'},this.accessToken);
      //     // });
      //   })
      //   .then((resp) => {
      //     return Promise.all(jobs);
      //   });
    });

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
