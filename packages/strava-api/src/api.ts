import { _, type Dict } from '@epdoc/type';
import * as assert from 'assert';
import request from 'superagent';
import { StravaCreds } from '../strava-creds.ts';
import { defaultAuthOpts } from './consts.ts';
import { Activity, Athelete, Segment } from './dep.ts';
import type * as Strava from './types.ts';

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

export type TokenUrlOpts = {
  code?: string;
};

export class StravaApi {
  public id: Strava.ClientId;
  public secret: Strava.Secret;
  private _credsFile: string;
  private _creds: StravaCreds;

  constructor(clientConfig: Strava.ClientConfig, credsFile: string) {
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

  public getAuthorizationUrl(options: Strava.AuthorizationUrlOpts = {}): string {
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
  public async requestToken(code: Strava.Code) {
    const payload = {
      // tslint:disable-next-line: object-literal-shorthand
      code: code,
      client_id: this.id,
      client_secret: this.secret,
      grant_type: 'authorization_code',
    };
    // console.log('getTokens request', payload);
    return request
      .post(STRAVA_URL.token)
      .send(payload)
      .then((resp) => {
        // console.log('getTokens response', resp.body);
        console.log('Authorization obtained.');
        return this.creds.write(resp.body);
      })
      .then((resp) => {
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
        refresh_token: this.creds.refreshToken,
      };
      return request
        .post(STRAVA_URL.token)
        .send(payload)
        .then((resp) => {
          console.log('Access token refreshed.');
          return this.creds.write(resp.body);
        })
        .catch((err) => {
          console.error('Failed to refresh access token:', err.message);
          throw err;
        });
    }
    return Promise.resolve();
  }

  public async getAthlete(athleteId?: number): Promise<Athelete> {
    await this.refreshToken();
    let url = STRAVA_URL.athlete;
    if (_.isNumber(athleteId)) {
      url = url + '/' + athleteId;
    }
    return request
      .get(url)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .then((resp) => {
        if (resp && resp instanceof Athelete) {
          return Promise.resolve(Athelete.newFromResponseData(resp.body));
        }
        throw new Error('Invalid Athelete return value');
      });
  }

  public async getActivities(options: Strava.ActivityOpts): Promise<Dict[]> {
    await this.refreshToken();
    let url = STRAVA_URL.activities;
    if (_.isNumber(options.athleteId)) {
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

  public async getStarredSegments(accum: Segment.Summary[], page: number = 1): Promise<void> {
    await this.refreshToken();
    const perPage = 200;
    return request
      .get(STRAVA_URL.starred)
      .query({ per_page: perPage, page: page })
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .then((resp) => {
        if (resp && Array.isArray(resp.body)) {
          console.log(`  Retrieved ${resp.body.length} starred segments for page ${page}`);
          resp.body.forEach((item) => {
            const result = Segment.Summary.newFromResponseData(item);
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

  public getStreamCoords(source: Strava.StreamSource, objId: Strava.ObjId, name: string) {
    const result: Strava.Coord[] = [];
    const query: Dict = {
      keys: Strava.StreamType.latlng,
      key_by_type: '',
    };
    return this.getStreams(source, objId, query)
      .then((resp) => {
        if (Array.isArray(resp.latlng)) {
          console.log(`  Get ${name} Found ${resp.latlng.length} coordinates`);
          return Promise.resolve(resp.latlng);
        }
        console.log(`  Get ${name} did not contain any coordinates`);
        return Promise.resolve([]);
      })
      .catch((err) => {
        console.log(`  Get ${name} coordinates ${err.message}`);
        return Promise.resolve([]);
      });
  }

  public async getDetailedActivity(activity: Activity.Base): Promise<Activity.Detailed> {
    await this.refreshToken();
    return request
      .get(STRAVA_URL.activities + '/' + activity.data.id)
      .set('Authorization', 'access_token ' + this.creds.accessToken)
      .then((resp) => {
        if (resp && resp.body instanceof Activity.Detailed) {
          return Promise.resolve(Activity.Detailed.newFromResponseData(resp.body));
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
  public async getStreams(source: Strava.StreamSource, objId: Strava.SegmentId, options: Query) {
    await this.refreshToken();
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

  public async getSegment(segmentId: Strava.SegmentId): Promise<void> {
    await this.refreshToken();
    return request
      .get(STRAVA_API_PREFIX + '/segments/' + segmentId)
      .set('Authorization', 'access_token ' + this.creds.accessToken);
  }

  public async getSegmentEfforts(segmentId: Strava.SegmentId, params: Query) {
    await this.refreshToken();
    return request.get(STRAVA_API_PREFIX + '/segments/' + segmentId + '/all_efforts').query(params);
  }
}
