import * as assert from 'assert';
import { isNumber } from 'epdoc-util';
import { Activity } from './models/activity';
import { Athelete } from './models/athlete';
import { DetailedActivity } from './models/detailed-activity';
import { SummarySegment } from './models/summary-segment';
import { StravaCreds } from './strava-creds';
import { Dict, EpochSeconds } from './util';
import request = require('superagent');

const STRAVA_URL_PREFIX = process.env.STRAVA_URL_PREFIX || 'https://www.strava.com';
const STRAVA_API_PREFIX = STRAVA_URL_PREFIX + '/api/v3';
const STRAVA_URL = {
  authorize: STRAVA_URL_PREFIX + '/oauth/authorize',
  token: STRAVA_URL_PREFIX + '/oauth/token',
  athlete: STRAVA_API_PREFIX + '/athlete',
  picture: STRAVA_API_PREFIX + '/athlete/picture',
  activities: STRAVA_API_PREFIX + '/activities',
  starred: STRAVA_API_PREFIX + '/segments/starred'
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
  segmentEfforts = 'segment_efforts'
}
export enum StravaStreamType {
  latlng = 'latlng',
  distance = 'distance',
  altitude = 'altitude'
}
export type StravaObjId = number;
export type StravaSegmentId = StravaObjId;
export type Query = Dict;
export type StravaCoord = [number, number];
export type StravaCoordData = {
  type: string;
  data: StravaCoord[];
};

export type StravaClientConfig = {
  id: StravaClientId;
  secret: StravaSecret;
};

export type StravaApiOpts = StravaClientConfig & {
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
  redirectUri: 'https://localhost'
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
  private _credsFile: string;
  private _creds: StravaCreds;

  constructor(clientConfig: StravaClientConfig, credsFile: string) {
    this.id = clientConfig.id || parseInt(process.env.STRAVA_CLIENT_ID, 10);
    this.secret = clientConfig.secret || process.env.STRAVA_CLIENT_SECRET;
    // this.token = opts.token || process.env.STRAVA_ACCESS_TOKEN;
    this._credsFile = credsFile;
  }

  public toString() {
    return '[Strava]';
  }

  public initCreds(): Promise<void> {
    this._creds = new StravaCreds(this._credsFile);
    return this._creds.read().then(() => {
      return this.refreshToken();
    });
  }

  get creds() {
    return this._creds;
  }

  public getAuthorizationUrl(options: AuthorizationUrlOpts = {}): string {
    assert.ok(this.id, 'A client ID is required.');

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

  

  /**
   * Exchanges code for refresh and access tokens from Strava. Writes these
   * tokens to ~/.strava/credentials.json.
   * @param code
   */
  public async requestToken(code: StravaCode) {
    const payload = {
      // tslint:disable-next-line: object-literal-shorthand
      code: code,
      client_id: this.id,
      client_secret: this.secret,
      grant_type: 'authorization_code'
    };
    // console.log('getTokens request', payload);
    return request
      .post(STRAVA_URL.token)
      .send(payload)
      .then(resp => {
        // console.log('getTokens response', resp.body);
        console.log('Authorization obtained.');
        return this.creds.write(resp.body);
      })
      .then(resp => {
        console.log('Credentials written to local storage');
      });
  }

  private async refreshToken(): Promise<void> {
    if (this.creds.needsRefresh()) {
      console.log('Refreshing access token...');
      const payload = {
        client_id: this.id,
        client_secret: this.secret,
        grant_type: 'refresh_token',
        refresh_token: this.creds.refreshToken
      };
      return request
        .post(STRAVA_URL.token)
        .send(payload)
        .then(resp => {
          console.log('Access token refreshed.');
          return this.creds.write(resp.body);
        })
        .catch(err => {
          console.error('Failed to refresh access token:', err.message);
          throw err;
        });
    }
    return Promise.resolve();
  }

  

  

  public async getAthlete(athleteId?: number): Promise<Athelete> {
    await this.refreshToken();
    let url = STRAVA_URL.athlete;
    if (isNumber(athleteId)) {
      url = url + '/' + athleteId;
    }
    return request
      .get(url)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .then(resp => {
        if (resp && Athelete.isInstance(resp.body)) {
          return Promise.resolve(Athelete.newFromResponseData(resp.body));
        }
        throw new Error('Invalid Athelete return value');
      });
  }

  public async getActivities(options: StravaActivityOpts): Promise<Dict[]> {
    await this.refreshToken();
    let url = STRAVA_URL.activities;
    if (isNumber(options.athleteId)) {
      url = url + '/' + options.athleteId;
    }
    return request
      .get(url)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .query(options.query)
      .then(resp => {
        if (!resp || !Array.isArray(resp.body)) {
          throw new Error(JSON.stringify(resp.body));
        }
        return Promise.resolve(resp.body);
      })
      .catch(err => {
        err.message = 'Activities - ' + err.message;
        throw err;
      });
  }

  public async getStarredSegments(accum: SummarySegment[], page: number = 1): Promise<void> {
    await this.refreshToken();
    const perPage = 200;
    return request
      .get(STRAVA_URL.starred)
      .query({ per_page: perPage, page: page })
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .then(resp => {
        if (resp && Array.isArray(resp.body)) {
          console.log(`  Retrieved ${resp.body.length} starred segments for page ${page}`);
          resp.body.forEach(item => {
            const result = SummarySegment.newFromResponseData(item);
            accum.push(result);
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
      key_by_type: ''
    };
    return this.getStreams(source, objId, query)
      .then(resp => {
        if (Array.isArray(resp.latlng)) {
          console.log(`  Get ${name} Found ${resp.latlng.length} coordinates`);
          return Promise.resolve(resp.latlng);
        }
        console.log(`  Get ${name} did not contain any coordinates`);
        return Promise.resolve([]);
      })
      .catch(err => {
        console.log(`  Get ${name} coordinates ${err.message}`);
        return Promise.resolve([]);
      });
  }

  public async getDetailedActivity(activity: Activity): Promise<DetailedActivity> {
    await this.refreshToken();
    return request
      .get(STRAVA_URL.activities + '/' + activity.data.id)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .then(resp => {
        if (resp && DetailedActivity.isInstance(resp.body)) {
          return Promise.resolve(DetailedActivity.newFromResponseData(resp.body));
        }
        throw new Error('Invalid DetailedActivity return value');
      })
      .catch(err => {
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
  public async getStreams(source: StravaStreamSource, objId: StravaSegmentId, options: Query) {
    await this.refreshToken();
    return request
      .get(`${STRAVA_API_PREFIX}/${source}/${objId}/streams`)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .query(options)
      .then(resp => {
        if (resp && Array.isArray(resp.body)) {
          const result: Dict = {};
          resp.body.forEach(item => {
            if (Array.isArray(item.data)) {
              result[item.type] = item.data;
            }
          });
          return Promise.resolve(result);
        }
        throw new Error(`Invalid data returned for ${source}`);
      });
  }

  public async getSegment(segmentId: StravaSegmentId): Promise<any> {
    await this.refreshToken();
    return request
      .get(STRAVA_API_PREFIX + '/segments/' + segmentId)
      .set('Authorization', 'access_token ' + this.creds.accessToken);
  }

  public async getSegmentEfforts(segmentId: StravaSegmentId, params: Query) {
    await this.refreshToken();
    return request.get(STRAVA_API_PREFIX + '/segments/' + segmentId + '/all_efforts').query(params);
  }
}
