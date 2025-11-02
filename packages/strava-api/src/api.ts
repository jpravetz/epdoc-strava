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

/**
 * The main class for interacting with the Strava API.
 *
 * This class provides a high-level interface for making authenticated requests to the Strava API. It handles the
 * authentication flow and provides methods for accessing various Strava resources.
 *
 * @example
 * ```typescript
 * import { Api as StravaApi } from '@jpravetz/strava-api';
 * import { File } from '@epdoc/fs';
 * import { Logger } from '@epdoc/logger';
 * import { ConsoleBuilder } from '@epdoc/msgbuilder';
 *
 * // 1. Create a logger and a context for logging
 * const log = new Logger({ builder: new ConsoleBuilder() });
 * const ctx = { log };
 *
 * // 2. Specify the path for storing authentication tokens
 * const userCredsFile = new File('~/.strava/credentials.json');
 *
 * // 3. Instantiate the API client
 * const api = new StravaApi(userCredsFile);
 *
 * // 4. Authenticate and make API calls
 * const isAuthenticated = await api.init(ctx);
 * if (isAuthenticated) {
 *   const athlete = await api.getAthlete(ctx);
 *   console.log(`Welcome, ${athlete.firstname} ${athlete.lastname}!`);
 * }
 * ```
 */
export class StravaApi<M extends Ctx.MsgBuilder, L extends Ctx.Logger<M>> {
  #auth: Auth.Service<M, L>;

  /**
   * Constructs a new `StravaApi` instance.
   *
   * @param userCredsFile The file path or `FS.File` instance for storing user authentication tokens.
   * @param clientCreds The Strava application credentials. This can be a single `ClientCredSrc` object or an array of them. Defaults to `{ env: true }`.
   */
  constructor(
    userCredsFile: FS.FilePath | FS.File,
    clientCreds: Strava.ClientCredSrc | Strava.ClientCredSrc[] = { env: true },
  ) {
    this.#auth = new Auth.Service(userCredsFile, clientCreds);
  }

  public toString(): string {
    return '[Strava]';
  }

  /**
   * Initializes the Strava API client by authenticating the user.
   *
   * This method orchestrates the entire authentication process. It will first attempt to load existing credentials.
   * If the credentials have expired, it will automatically try to refresh them. If no valid credentials can be
   * found or refreshed, it will initiate a web-based authentication flow.
   *
   * @param ctx The application context, which includes a logger.
   * @param opts Options for initialization.
   * @param opts.force If `true`, the web-based authentication flow will be forced, even if a valid token already exists.
   * @returns A promise that resolves to `true` if authentication is successful, otherwise `false`.
   */
  async init(ctx: Ctx.IContext<M, L>, opts: { force: boolean } = { force: false }): Promise<boolean> {
    return await this.#auth.init(ctx, opts);
  }

  /**
   * Provides access to the `StravaCreds` instance, which manages the authentication credentials.
   *
   * This can be used to directly access the user's credentials, for example to get the access token or to check
   * the expiration date.
   */
  get creds(): StravaCreds {
    return this.#auth.creds;
  }

  async #refreshToken(ctx: Ctx.IContext<M, L>, force = false): Promise<void> {
    await this.#auth.refreshToken(ctx, force);
  }

  /**
   * Retrieves the profile of the authenticated athlete.
   *
   * This method will automatically handle token refreshes if necessary.
   *
   * @param ctx The application context for logging.
   * @param athleteId The ID of the athlete to retrieve. If not provided, the currently authenticated athlete's
   * profile will be returned.
   * @returns A promise that resolves to the athlete's detailed profile.
   */
  public async getAthlete(
    ctx: Ctx.IContext<M, L>,
    athleteId?: Schema.AthleteId,
  ): Promise<Schema.DetailedAthlete> {
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
   * Retrieves a list of activities for a specific athlete.
   *
   * This method will automatically handle token refreshes if necessary.
   *
   * @param ctx The application context for logging.
   * @param options Options for retrieving activities.
   * @returns A promise that resolves to an array of activities.
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

  /**
   * Retrieves the authenticated athlete's starred segments.
   *
   * This method recursively fetches all pages of starred segments and accumulates them into the provided array.
   *
   * @param ctx The application context for logging.
   * @param accum An array to accumulate the segments into.
   * @param page The page number to retrieve. Defaults to 1.
   */
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

  /**
   * Retrieves the geographical coordinates for a given activity or segment.
   *
   * This method is useful for plotting the route of an activity or segment on a map.
   *
   * @param ctx The application context for logging.
   * @param source The type of object to retrieve the stream for (e.g., 'activities', 'segments').
   * @param objId The ID of the activity or segment.
   * @param name The name of the object, used for logging purposes.
   * @returns A promise that resolves to an array of coordinates, where each coordinate is a [latitude, longitude] pair.
   */
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

  /**
   * Retrieves the detailed representation of a specific activity.
   *
   * This method is useful for getting more detailed information about an activity than is available in the summary representation.
   *
   * @param ctx The application context for logging.
   * @param activity The summary representation of the activity.
   * @returns A promise that resolves to the detailed representation of the activity.
   */
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
   * Retrieves the stream data for a given activity or segment.
   *
   * Streams are the raw data associated with an activity or segment, such as latitude/longitude, heart rate, or power.
   *
   * @param ctx The application context for logging.
   * @param source The type of object to retrieve the stream for (e.g., 'activities', 'segments').
   * @param objId The ID of the activity or segment.
   * @param options Additional query parameters for the request.
   * @returns A promise that resolves to a dictionary of stream data, where the keys are the stream types and the values
   * are arrays of the stream data.
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

  /**
   * Retrieves a specific segment.
   *
   * @param ctx The application context for logging.
   * @param segmentId The ID of the segment to retrieve.
   * @returns A promise that resolves to the segment data.
   */
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

  /**
   * Retrieves the efforts for a specific segment.
   *
   * @param ctx The application context for logging.
   * @param segmentId The ID of the segment.
   * @param params Additional query parameters for the request.
   * @returns A promise that resolves to the segment efforts data.
   */
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
