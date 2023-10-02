import { Dict, isArray } from 'epdoc-util';
import { Activity, ActivityFilter, ActivityOpts } from './models/activity';
import { Athlete, StravaBike } from './models/athlete';
import { RefreshOpts, SegmentCacheDict, SegmentCacheFile } from './segment-cache-file';
import { Server } from './server';
import { StravaActivityOpts, StravaApi, StravaClientSecret, StravaStreamSource } from './strava-api';
import { StravaCreds } from './strava-creds';
import { EpochSeconds, FilePath, LogFunctions, LogOpts } from './util';

const REQ_LIMIT = 10;

export type AthleteID = number;
export type DateRange = {
  before: EpochSeconds;
  after: EpochSeconds;
};
export type GetSegmentsOpts = RefreshOpts & {
  cacheFilePath?: FilePath; // If specified, then use the cache, which only stores a summary of segment data
};

/**
 * Strava Context object to hold any context needed during a session.
 */
export class StravaContext {
  public api: StravaApi;
  public segCacheFile?: SegmentCacheFile;
  public bikes: Dict;
  public activities: Activity[];
  public athlete: Athlete;
  public segments: Dict[];
  public aliases: Dict; // XXXX
  private _log: LogFunctions;

  constructor(client: StravaClientSecret, credentials: StravaCreds, opts: LogOpts) {
    this.api = new StravaApi(client, credentials, opts);
    this._log = opts.log;
  }

  public async auth() {
    return this.api
      .initCreds()
      .then((resp) => {
        if (!this.api.creds.areValid()) {
          this._log.info('Authorization required. Opening web authorization page');
          const authServer = new Server(this.api, { log: this._log });
          return authServer.run().then((resp) => {
            this._log.info('Closing server');
            authServer.close();
          });
        } else {
          this._log.info('Authorization not required');
        }
      })
      .then((resp) => {
        if (!this.api.creds.areValid()) {
          throw new Error('Invalid credentials');
        }
      });
  }

  public async getAthlete(id: AthleteID): Promise<void> {
    return this.api
      .getAthlete(id)
      .then((resp) => {
        this.athlete = resp;
        this.registerBikes(this.athlete.bikes);
      })
      .catch((err) => {
        err.message = 'Athlete ' + err.message;
        throw err;
      });
  }

  private registerBikes(bikes: StravaBike[]) {
    if (bikes && bikes.length) {
      bikes.forEach((bike) => {
        this.bikes[bike.id] = bike;
      });
    }
  }

  get cachedSegments(): SegmentCacheDict {
    return this.segCacheFile.segments;
  }

  public async getSegments(segCachPath: FilePath, opts: GetSegmentsOpts): Promise<void> {
    this.segCacheFile = new SegmentCacheFile(segCachPath, this.api, {
      log: this._log,
    });
    return this.segCacheFile.get(opts);
  }

  public async getStarredSegments(opts: GetSegmentsOpts) {
    if (opts.cacheFilePath) {
      this.segCacheFile = new SegmentCacheFile(opts.cacheFilePath, this.api, {
        log: this._log,
      });
      return this.segCacheFile.get(opts);
    }
    return this.api.getStarredSegments().then((resp) => {
      this.segments = resp;
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
  public async getActivities(dateRanges: DateRange[], opts: LogOpts): Promise<void> {
    let results: Activity[] = [];
    dateRanges = isArray(dateRanges) ? dateRanges : [dateRanges];

    return dateRanges
      .reduce((promiseChain, dateRange) => {
        return promiseChain.then(() => {
          let job = this.getActivitiesForDateRange(dateRange, opts).then((resp) => {
            results = results.concat(resp);
          });
          return job;
        });
      }, Promise.resolve())
      .then((resp) => {
        // results = this.filterActivities(results);
        this.activities = results.sort(Activity.compareStartDate);
      });
  }

  public async filterActivities(filter: ActivityFilter) {
    this.activities = this.activities.filter((activity) => {
      return activity.include(filter);
    });
  }

  private async getActivitiesForDateRange(dateRange: DateRange, opts: LogOpts): Promise<Activity[]> {
    const params: StravaActivityOpts = {
      athleteId: this.athlete.id,
      query: {
        per_page: 200,
        after: dateRange.after,
        before: dateRange.before,
      },
    };
    return this.api.getActivities(params).then((resp) => {
      const activities = resp as Dict[];
      const results: Activity[] = [];
      const activityOpts: ActivityOpts = {
        log: opts.log,
        aliases: this.aliases,
        segCacheFile: this.segCacheFile,
      };
      resp.forEach((data) => {
        const activity = Activity.newFromResponseData(data, activityOpts);
        if (activity) {
          results.push(activity);
        }
      });
      return Promise.resolve(results);
    });
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

  private async addActivityDetail(activity: Activity): Promise<void> {
    return this.api.getDetailedActivity(activity).then((data) => {
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
            const job = this.api.getStreamCoords(StravaStreamSource.activities, activity.id, name).then((resp) => {
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

    return this.cachedSegments
      .reduce((promiseChain, item) => {
        return promiseChain.then(() => {
          return this.api.getStreamCoords(StravaStreamSource.segments, item.id, item.name).then((resp) => {
            item.coordinates = resp;
          });
        });
      }, Promise.resolve())
      .then((resp) => {
        return Promise.resolve();
      });
  }
}
