import { Dict, isNonEmptyString, isNumber, isObject, isPosInteger } from 'epdoc-util';
import { Activity } from './models/activity';
import { Athlete } from './models/athlete';
import { DetailedActivity } from './models/detailed-activity';
import { SummarySegment } from './models/summary-segment';
import { StravaCreds } from './strava-creds';
import { EpochSeconds, LogFunctions, LogOpts } from './util';
import request = require('superagent');

const STRAVA_URL_PREFIX = process.env.STRAVA_URL_PREFIX || 'https://www.strava.com';
const STRAVA_API_PREFIX = STRAVA_URL_PREFIX + '/api/v3';
const STRAVA_URL = {
  authorize: STRAVA_URL_PREFIX + '/oauth/authorize',
  token: STRAVA_URL_PREFIX + '/oauth/token',
  athlete: STRAVA_API_PREFIX + '/athlete',
  picture: STRAVA_API_PREFIX + '/athlete/picture',
  activities: STRAVA_API_PREFIX + '/activities',
  starred: STRAVA_API_PREFIX + '/segments/starred',
};

export type StravaCode = string;
export type StravaSecret = string;
export type StravaAccessToken = string;
export type StravaRefreshToken = string;
export type StravaClientId = number;

export enum StravaStreamSource {
  activities = 'activities',
  segments = 'segments',
  routes = 'routes',
  segmentEfforts = 'segment_efforts',
}
export enum StravaStreamType {
  latlng = 'latlng',
  distance = 'distance',
  altitude = 'altitude',
}
export type StravaObjId = number;
export type StravaSegmentId = StravaObjId;
export type Query = Dict;
export type StravaCoord = [number, number];
export type StravaCoordData = {
  type: string;
  data: StravaCoord[];
};

export type StravaClientSecret = {
  id: StravaClientId;
  secret: StravaSecret;
};

export function isStravaClientSecret(val: any): val is StravaClientSecret {
  return isObject(val) && isNonEmptyString(val.secret) && isPosInteger(val.id);
}

export type StravaApiOpts = StravaClientSecret & {
  token: StravaAccessToken;
};

export type AuthorizationUrlOpts = {
  redirectUri?: string;
  scope?: string;
  state?: string;
  approvalPrompt?: string;
};

const defaultAuthOpts: AuthorizationUrlOpts = {
  scope: 'read_all,activity:read_all,profile:read_all',
  state: '',
  approvalPrompt: 'auto',
  redirectUri: 'https://localhost',
};

export type TokenUrlOpts = {
  code?: string;
};

export type StravaActivityOpts = {
  athleteId: number;
  query: {
    after: EpochSeconds;
    before: EpochSeconds;
    per_page: number;
    page?: number;
  };
};

export class StravaApi {
  public id: StravaClientId;
  public secret: StravaSecret;
  private _creds: StravaCreds;
  private _log: LogFunctions;

  constructor(clientConfig: StravaClientSecret, creds: StravaCreds, opts: LogOpts) {
    this.id = clientConfig.id || parseInt(process.env.STRAVA_CLIENT_ID, 10);
    this.secret = clientConfig.secret || process.env.STRAVA_CLIENT_SECRET;
    // this.token = opts.token || process.env.STRAVA_ACCESS_TOKEN;
    this._creds = creds;
    this._log = opts.log;
  }

  public toString() {
    return '[Strava]';
  }

  /**
   * Read OAUTH token file and places result in creds. This should be done
   * before trying to authenticate with Strava.
   * @returns
   */
  public async initCreds(): Promise<void> {
    return this._creds.read();
  }

  /**
   * The OAUTH tokens that were read by initCreds(). If these creds are valid
   * (creds.isValid) then authentication is not required.  If these creds are
   * invalid, the caller will need to create an HTTP server (Server.ts) to use
   * to retrieve updated tokens.
   */
  get creds(): StravaCreds {
    return this._creds;
  }

  private getAuthorizationUrl(options: AuthorizationUrlOpts = {}): string {
    if (!this.id) {
      throw new Error('A client ID is required.');
    }

    const opts = Object.assign(defaultAuthOpts, options);

    return (
      `${STRAVA_URL.authorize}?client_id=${this.id}` +
      `&redirect_uri=${encodeURIComponent(opts.redirectUri)}` +
      `&scope=${opts.scope}` +
      `&state=${opts.state}` +
      `&approval_prompt=${opts.approvalPrompt}` +
      `&response_type=code`
    );
  }

  private getTokenUrl(options: TokenUrlOpts = {}): string {
    const opts = Object.assign(defaultAuthOpts, options);

    return (
      `${STRAVA_URL.token}?client_id=${this.id}` +
      `&secret=${this.secret}` +
      `&code=${opts.code}` +
      `&grant_type=authorization_code`
    );
  }

  /**
   * Exchanges code for refresh and access tokens from Strava. Writes these
   * tokens to ~/.strava/credentials.json.
   * @param code
   */
  private async getTokens(code: StravaCode) {
    const payload = {
      // tslint:disable-next-line: object-literal-shorthand
      code: code,
      client_id: this.id,
      client_secret: this.secret,
      grant_type: 'authorization_code',
    };
    // this._log.info('getTokens request', payload);
    return request
      .post(STRAVA_URL.token)
      .send(payload)
      .then((resp) => {
        // this._log.info('getTokens response', resp.body);
        this._log.info('Authorization obtained.');
        return this.creds.write(resp.body);
      })
      .then((resp) => {
        this._log.info('Credentials written to local storage');
      });
  }

  private async acquireToken(code: string): Promise<string | Error> {
    if (!this.id || !this.secret) {
      return Promise.resolve(new Error('A client ID and secret is required'));
    }

    const query = {
      client_id: this.id,
      client_secret: this.secret,
      // tslint:disable-next-line: object-literal-shorthand
      code: code,
    };

    return request
      .post(STRAVA_URL.token)
      .query(query)
      .then((resp) => {
        return Promise.resolve(resp.body.access_token);
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }

  private authHeaders(): Dict {
    if (this.secret) {
      throw new Error('An access token is required');
    }

    return {
      Authorization: 'access_token ' + this.creds.accessToken,
    };
  }

  public async getAthlete(athleteId?: number): Promise<Athlete> {
    let url = STRAVA_URL.athlete;
    if (isNumber(athleteId)) {
      url = url + '/' + athleteId;
    }
    return request
      .get(url)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .then((resp) => {
        if (resp && Athlete.isInstance(resp.body)) {
          return Promise.resolve(Athlete.newFromResponseData(resp.body));
        }
        throw new Error('Invalid Athelete return value');
      });
  }

  public async getActivities(options: StravaActivityOpts): Promise<Dict[]> {
    let url = STRAVA_URL.activities;
    if (isNumber(options.athleteId)) {
      url = url + '/' + options.athleteId;
    }
    return request
      .get(url)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .query(options.query)
      .then((resp) => {
        if (!resp || !Array.isArray(resp.body)) {
          throw new Error(JSON.stringify(resp.body));
        }
        return Promise.resolve(resp.body);
      })
      .catch((err) => {
        err.message = 'Activities - ' + err.message;
        throw err;
      });
  }

  /**
   * Retrieve a list of SummarySegment data for starred segments for the logged-i nuser.
   * @param accum
   * @param page
   * @returns A list of SummarySegment data, which is condensed data from getStarredSegments()
   */
  public async getStarredSegmentSummaries(): Promise<SummarySegment[]> {
    let rawResult = [];
    return this.getStarredSegments(rawResult, 1).then((resp) => {
      let result = [];
      rawResult.forEach((item) => {
        const seg = SummarySegment.newFromResponseData(item);
        result.push(seg);
      });
      return result;
    });
  }

  /**
   * Retrieve all starred segments for the logged-in user.
   * @see {@link https://developers.strava.com/docs/reference/#api-Segments-getLoggedInAthleteStarredSegments} for further info
   * @param accum An empty array
   * @param page Set to 1 for first call, recurses for subsequent pages.
   * @returns Raw JSON from Strava
   */
  public async getStarredSegments(accum: any[], page: number = 1): Promise<void> {
    const perPage = 200;
    return request
      .get(STRAVA_URL.starred)
      .query({ per_page: perPage, page: page })
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .then((resp) => {
        if (resp && Array.isArray(resp.body)) {
          this._log.info(`  Retrieved ${resp.body.length} starred segments for page ${page}`);
          resp.body.forEach((item) => {
            accum.push(item);
          });
          if (resp.body.length >= perPage) {
            return this.getStarredSegments(accum, page + 1);
          }
          return Promise.resolve();
        }
        throw new Error('Invalid starred segments return value');
      });
  }

  public getStreamCoords(source: StravaStreamSource, objId: StravaObjId, name: string) {
    const result: StravaCoord[] = [];
    const query: Dict = {
      keys: StravaStreamType.latlng,
      key_by_type: '',
    };
    return this.getStreams(source, objId, query)
      .then((resp) => {
        if (Array.isArray(resp.latlng)) {
          this._log.info(`  Get ${name} Found ${resp.latlng.length} coordinates`);
          return Promise.resolve(resp.latlng);
        }
        this._log.info(`  Get ${name} did not contain any coordinates`);
        return Promise.resolve([]);
      })
      .catch((err) => {
        this._log.info(`  Get ${name} coordinates ${err.message}`);
        return Promise.resolve([]);
      });
  }

  public async getDetailedActivity(activity: Activity): Promise<DetailedActivity> {
    return request
      .get(STRAVA_URL.activities + '/' + activity.data.id)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .then((resp) => {
        if (resp && DetailedActivity.isInstance(resp.body)) {
          return Promise.resolve(DetailedActivity.newFromResponseData(resp.body));
        }
        throw new Error('Invalid DetailedActivity return value');
      })
      .catch((err) => {
        err.message = `getActivity id='${activity.data.id}' ${err.message} (${activity.toString()})`;
        throw err;
      });
  }

  /**
   * Retrieve data for the designated type of stream
   * @param objId The activity or segement ID
   * @param types An array, usually [ 'latlng' ]
   * @param options Additional query string parameters, if any
   * @returns {*}
   */
  private async getStreams(source: StravaStreamSource, objId: StravaSegmentId, options: Query) {
    return request
      .get(`${STRAVA_API_PREFIX}/${source}/${objId}/streams`)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .query(options)
      .then((resp) => {
        if (resp && Array.isArray(resp.body)) {
          const result: Dict = {};
          resp.body.forEach((item) => {
            if (Array.isArray(item.data)) {
              result[item.type] = item.data;
            }
          });
          return Promise.resolve(result);
        }
        throw new Error(`Invalid data returned for ${source}`);
      });
  }

  private async getSegment(segmentId: StravaSegmentId): Promise<any> {
    return request
      .get(STRAVA_API_PREFIX + '/segments/' + segmentId)
      .set('Authorization', 'access_token ' + this.creds.accessToken);
  }

  private async getSegmentEfforts(segmentId: StravaSegmentId, params: Query) {
    return request.get(STRAVA_API_PREFIX + '/segments/' + segmentId + '/all_efforts').query(params);
  }
}
