import type * as FS from '@epdoc/fs/fs';
import { _, type Dict } from '@epdoc/type';
import type { StravaCreds } from './auth/creds.ts';
import * as Auth from './auth/mod.ts';
import type * as Ctx from './context.ts';
import * as Schema from './schema/mod.ts';
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

export type TokenUrlOpts = {
  code?: string;
};

export class StravaApi<M extends Ctx.MsgBuilder, L extends Ctx.Logger<M>> {
  #auth: Auth.Service<M, L>;
  // public id: Strava.ClientId;
  // public secret: Strava.Secret;
  // #creds: StravaCreds;

  constructor(clientConfig: Strava.ClientConfig, credsFile: FS.File) {
    this.#auth = new Auth.Service(clientConfig, credsFile);
    // this.id = clientConfig.id || _.asInt(Deno.env.get('STRAVA_CLIENT_ID'), 10);
    // this.secret = clientConfig.secret || Deno.env.get('STRAVA_CLIENT_SECRET') || '';
    // this.token = opts.token || process.env.STRAVA_ACCESS_TOKEN;
    // this.#creds = new StravaCreds(credsFile);
  }

  public toString(): string {
    return '[Strava]';
  }

  async init(ctx: Ctx.IContext<M, L>, opts: { force: boolean } = { force: false }): Promise<boolean> {
    return await this.#auth.init(ctx, opts);
  }

  get creds(): StravaCreds {
    return this.#auth.creds;
  }

  async #refreshToken(ctx: Ctx.IContext<M, L>, force = false): Promise<void> {
    await this.#auth.refreshToken(ctx, force);
  }

  public async getAthlete(ctx: Ctx.IContext<M, L>, athleteId?: number): Promise<Schema.DetailedAthlete> {
    await this.#refreshToken(ctx);
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

    const data = await resp.json() as Schema.DetailedAthlete;
    return data;
  }

  /**
   * Returns a DetailedActivity
   * @param options
   * @returns
   */
  public async getActivities(ctx: Ctx.IContext<M, L>, options: Strava.ActivityOpts): Promise<Dict[]> {
    await this.#refreshToken(ctx);
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

  public async getStarredSegments(
    ctx: Ctx.IContext<M, L>,
    accum: Schema.SummarySegment[],
    page: number = 1,
  ): Promise<void> {
    await this.#refreshToken(ctx);
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

    const m0 = ctx.log.mark();
    const resp = await fetch(url.toString(), reqOpts);
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Failed to get starred segments: ${resp.status} ${resp.statusText} - ${errorText}`);
    }

    const data: Schema.SummarySegment[] = await resp.json() as Schema.SummarySegment[];
    if (_.isArray(data)) {
      ctx.log.info.h2('Retrieved').count(data.length).h2('starred segments for page').value(page).ewt(m0);
      data.forEach((item: Schema.SummarySegment) => { // Use unknown for now, as Segment.Summary.newFromResponseData expects raw data
        accum.push(item);
      });
      if (data.length >= perPage) {
        return this.getStarredSegments(ctx, accum, page + 1);
      }
      return Promise.resolve();
    } else {
      ctx.log.demark(m0);
    }
    throw new Error('Invalid starred segments return value');
  }

  public async getStreamCoords(
    ctx: Ctx.IContext<M, L>,
    source: Schema.StreamKeyType,
    objId: Strava.ObjId,
    name: string,
  ): Promise<Strava.Coord[]> {
    const query: Dict = {
      keys: Schema.StreamKeys.LatLng,
      key_by_type: '',
    };
    const m0 = ctx.log.mark();
    try {
      const resp = await this.getStreams(ctx, source, objId, query);
      if (Array.isArray(resp.latlng)) {
        ctx.log.info.h2('Get').value(name).h2('Found').count(resp.latlng.length).h2('coordinates').ewt(m0);
        return resp.latlng;
      }
      ctx.log.info.h2('Get').value(name).h2('did not contain unknown coordinates').ewt(m0);
      return [];
    } catch (error: unknown) {
      const err = _.asError(error);
      ctx.log.error.h2('Get').value(name).h2('coordinates').err(err).ewt(m0);
      return [];
    }
  }

  public async getDetailedActivity(
    ctx: Ctx.IContext<M, L>,
    activity: Schema.SummaryActivity,
  ): Promise<Schema.DetailedActivity> {
    await this.#refreshToken(ctx);
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
        return data as Schema.DetailedActivity;
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
    ctx: Ctx.IContext<M, L>,
    source: Schema.StreamKeyType,
    objId: Strava.SegmentId,
    options: Strava.Query,
  ): Promise<Dict> {
    await this.#refreshToken(ctx);
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

  public async getSegment(ctx: Ctx.IContext<M, L>, segmentId: Strava.SegmentId): Promise<unknown> { // Changed return type to unknown
    await this.#refreshToken(ctx);
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

  public async getSegmentEfforts(
    ctx: Ctx.IContext<M, L>,
    segmentId: Strava.SegmentId,
    params: Strava.Query,
  ): Promise<unknown> { // Changed return type to unknown
    await this.#refreshToken(ctx);
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
