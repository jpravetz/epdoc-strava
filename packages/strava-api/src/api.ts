import type * as FS from '@epdoc/fs/fs';
import { _, type Dict } from '@epdoc/type';
import { assert } from '@std/assert';
import { StravaCreds } from './creds.ts';
import * as Models from './models/mod.ts';
import type * as Strava from './types.ts';

const STRAVA_URL_PREFIX = Deno.env.get('STRAVA_URL_PREFIX') || 'https://www.strava.com';
const STRAVA_API_PREFIX = STRAVA_URL_PREFIX + '/api/v3';
const STRAVA_URL = {
  authorize: STRAVA_URL_PREFIX + '/oauth/authorize',
  token: STRAVA_URL_PREFIX + '/oauth/token',
  athlete: STRAVA_API_PREFIX + '/athlete',
  picture: STRAVA_API_PREFIX + '/athlete/picture',
  activities: STRAVA_API_PREFIX + '/activities',
  starred: STRAVA_API_PREFIX + '/segments/starred',
};

export const defaultAuthOpts: Strava.AuthUrlOpts = {
  scope: 'read_all,activity:read_all,profile:read_all',
  state: '',
  approvalPrompt: 'auto',
  redirectUri: 'https://localhost',
};

export type TokenUrlOpts = {
  code?: string;
};

export class StravaApi {
  public id: Strava.ClientId;
  public secret: Strava.Secret;
  #fsCredsFile: FS.File;
  #creds: StravaCreds;

  constructor(clientConfig: Strava.ClientConfig, credsFile: FS.File) {
    this.id = clientConfig.id || _.asInt(Deno.env.get('STRAVA_CLIENT_ID'), 10);
    this.secret = clientConfig.secret || Deno.env.get('STRAVA_CLIENT_SECRET') || '';
    // this.token = opts.token || process.env.STRAVA_ACCESS_TOKEN;
    this.#fsCredsFile = credsFile;
    this.#creds = new StravaCreds(credsFile);
  }

  public toString(): string {
    return '[Strava]';
  }

  async initCreds(): Promise<void> {
    await this.#creds.read();
    await this.refreshToken();
  }

  get creds(): StravaCreds {
    return this.#creds;
  }

  public getAuthUrl(options: Strava.AuthUrlOpts = {}): string {
    assert(this.id, 'A client ID is required.');

    const opts: Strava.AuthUrlOpts = Object.assign(defaultAuthOpts, options);

    return (
      `${STRAVA_URL.authorize}?client_id=${this.id}` +
      `&redirect_uri=${encodeURIComponent(opts.redirectUri as string)}` +
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
  async requestToken(code: Strava.Code) {
    const reqOpts: RequestInit = {
      method: 'POST',
      body: JSON.stringify({
        code: code,
        client_id: this.id,
        client_secret: this.secret,
        grant_type: 'authorization_code',
      }),
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
    };

    const resp = await fetch(STRAVA_URL.token, reqOpts);
    if (resp && resp.ok) {
      console.log('Authorization obtained.');
      const data: Strava.StravaCredsData = await resp.json();
      await this.creds.write(data);
      console.log('Credentials written to local storage');
    }
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

      const reqOpts: RequestInit = {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
      };

      try {
        const resp = await fetch(STRAVA_URL.token, reqOpts);
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Failed to refresh access token: ${resp.status} ${resp.statusText} - ${errorText}`);
        }
        console.log('Access token refreshed.');
        const data: Strava.StravaCredsData = await resp.json();
        await this.creds.write(data);
      } catch (error: unknown) {
        const err = _.asError(error);
        console.error('Failed to refresh access token:', err.message);
        throw err;
      }
    }
    return Promise.resolve();
  }

  public async getAthlete(athleteId?: number): Promise<Models.DetailedAthlete> {
    await this.refreshToken();
    let url = STRAVA_URL.athlete;
    if (_.isNumber(athleteId)) {
      url = url + '/' + athleteId;
    }

    const reqOpts: RequestInit = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.creds.accessToken, // Strava API uses Bearer token
        'accept': 'application/json',
      },
    };

    const resp = await fetch(url, reqOpts);
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Failed to get athlete: ${resp.status} ${resp.statusText} - ${errorText}`);
    }

    const data = await resp.json() as Models.DetailedAthlete;
    return data;
  }

  public async getActivities(options: Strava.ActivityOpts): Promise<Dict[]> {
    await this.refreshToken();
    let url = new URL(STRAVA_URL.activities);
    if (_.isNumber(options.athleteId)) {
      url = new URL(url.toString() + '/' + options.athleteId);
    }

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        url.searchParams.append(key, String(value));
      }
    }

    const reqOpts: RequestInit = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.creds.accessToken,
        'accept': 'application/json',
      },
    };

    try {
      const resp = await fetch(url.toString(), reqOpts);
      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Failed to get activities: ${resp.status} ${resp.statusText} - ${errorText}`);
      }

      const data = await resp.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid activities return value: Expected an array.');
      }
      return data;
    } catch (error: unknown) {
      const err = _.asError(error);
      err.message = 'Activities - ' + err.message;
      throw err;
    }
  }

  public async getStarredSegments(accum: Models.SummarySegment[], page: number = 1): Promise<void> {
    await this.refreshToken();
    const perPage = 200;
    const url = new URL(STRAVA_URL.starred);
    url.searchParams.append('per_page', String(perPage));
    url.searchParams.append('page', String(page));

    const reqOpts: RequestInit = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.creds.accessToken,
        'accept': 'application/json',
      },
    };

    const resp = await fetch(url.toString(), reqOpts);
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Failed to get starred segments: ${resp.status} ${resp.statusText} - ${errorText}`);
    }

    const data = await resp.json();
    if (_.isArray(data)) {
      console.log(`  Retrieved ${data.length} starred segments for page ${page}`);
      data.forEach((item: unknown) => { // Use unknown for now, as Segment.Summary.newFromResponseData expects raw data
        accum.push(item as Models.SummarySegment);
      });
      if (data.length >= perPage) {
        return this.getStarredSegments(accum, page + 1);
      }
      return Promise.resolve();
    }
    throw new Error('Invalid starred segments return value');
  }

  public async getStreamCoords(
    source: Models.StreamKeyType,
    objId: Strava.ObjId,
    name: string,
  ): Promise<Strava.Coord[]> {
    const query: Dict = {
      keys: Models.StreamKeys.LatLng,
      key_by_type: '',
    };
    try {
      const resp = await this.getStreams(source, objId, query);
      if (Array.isArray(resp.latlng)) {
        console.log(`  Get ${name} Found ${resp.latlng.length} coordinates`);
        return resp.latlng;
      }
      console.log(`  Get ${name} did not contain unknown coordinates`);
      return [];
    } catch (error: unknown) {
      const err = _.asError(error);
      console.log(`  Get ${name} coordinates ${err.message}`);
      return [];
    }
  }

  public async getDetailedActivity(activity: Models.SummaryActivity): Promise<Models.DetailedActivity> {
    await this.refreshToken();
    const url = STRAVA_URL.activities + '/' + activity.id;

    const reqOpts: RequestInit = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.creds.accessToken,
        'accept': 'application/json',
      },
    };

    try {
      const resp = await fetch(url, reqOpts);
      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Failed to get detailed activity: ${resp.status} ${resp.statusText} - ${errorText}`);
      }

      const data = await resp.json();
      if (data) {
        return data as Models.DetailedActivity;
      }
      throw new Error('Invalid DetailedActivity return value');
    } catch (error: unknown) {
      const err = _.asError(error);
      err.message = `getActivity id='${activity.id}' ${err.message} (${activity.toString()})`;
      throw err;
    }
  }

  /**
   * Retrieve data for the designated type of stream
   * @param objId The activity or segement ID
   * @param types An array, usually [ 'latlng' ]
   * @param options Additional query string parameters, if unknown
   * @returns {*}
   */
  public async getStreams(
    source: Models.StreamKeyType,
    objId: Strava.SegmentId,
    options: Strava.Query,
  ): Promise<Dict> {
    await this.refreshToken();
    const url = new URL(`${STRAVA_API_PREFIX}/${source}/${objId}/streams`);

    if (options) {
      for (const key in options) {
        url.searchParams.append(key, String(options[key]));
      }
    }

    const reqOpts: RequestInit = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.creds.accessToken,
        'accept': 'application/json',
      },
    };

    const resp = await fetch(url.toString(), reqOpts);
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Failed to get streams: ${resp.status} ${resp.statusText} - ${errorText}`);
    }

    const data = await resp.json();
    if (Array.isArray(data)) {
      const result: Dict = {};
      data.forEach((item: unknown) => {
        if (_.isDict(item) && _.isArray(item.data) && _.isString(item.type)) {
          result[item.type] = item.data;
        }
      });
      return result;
    }
    throw new Error(`Invalid data returned for ${source}`);
  }

  public async getSegment(segmentId: Strava.SegmentId): Promise<unknown> { // Changed return type to unknown
    await this.refreshToken();
    const url = STRAVA_API_PREFIX + '/' + 'segments/' + segmentId;

    const reqOpts: RequestInit = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.creds.accessToken,
        'accept': 'application/json',
      },
    };

    const resp = await fetch(url, reqOpts);
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Failed to get segment: ${resp.status} ${resp.statusText} - ${errorText}`);
    }

    return resp.json(); // Return the JSON data
  }

  public async getSegmentEfforts(segmentId: Strava.SegmentId, params: Strava.Query): Promise<unknown> { // Changed return type to unknown
    await this.refreshToken();
    const url = new URL(STRAVA_API_PREFIX + '/' + 'segments/' + segmentId + '/' + 'all_efforts');

    if (params) {
      for (const key in params) {
        url.searchParams.append(key, String(params[key]));
      }
    }

    const reqOpts: RequestInit = {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + this.creds.accessToken,
        'accept': 'application/json',
      },
    };

    const resp = await fetch(url.toString(), reqOpts);
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Failed to get segment efforts: ${resp.status} ${resp.statusText} - ${errorText}`);
    }

    return resp.json(); // Return the JSON data
  }
}
