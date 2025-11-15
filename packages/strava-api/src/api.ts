import type * as FS from '@epdoc/fs/fs';
import { _, type Dict } from '@epdoc/type';
import { Activity } from './activity.ts';
import type { StravaCreds } from './auth/creds.ts';
import * as Auth from './auth/mod.ts';
import type * as Ctx from './context.ts';
import {
  hasLatLngData,
  isDetailedActivity,
  isDetailedAthlete,
  isSegmentEffortArray,
  isStravaId,
  isStreamArray,
  isStreamSet,
  isSummaryActivityArray,
  isSummarySegment,
  isSummarySegmentArray,
} from './guards.ts';
import * as Schema from './schema/mod.ts';
import * as Strava from './types.ts';

const STRAVA_URL_PREFIX = Deno.env.get('STRAVA_URL_PREFIX') || 'https://www.strava.com';
const STRAVA_API_PREFIX = STRAVA_URL_PREFIX + '/api/v3';
const STRAVA_URL = {
  authorize: STRAVA_URL_PREFIX + '/oauth/authorize',
  token: STRAVA_URL_PREFIX + '/oauth/token',
  athlete: STRAVA_API_PREFIX + '/athlete',
  picture: STRAVA_API_PREFIX + '/athlete/picture',
  activities: STRAVA_API_PREFIX + '/athlete/activities',
  detailedActivity: STRAVA_API_PREFIX + '/activities',
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
export class Api<M extends Ctx.MsgBuilder, L extends Ctx.Logger<M>> {
  public Context!: Ctx.IContext<M, L>;
  public AuthService!: Auth.Service<M, L>;
  public Activity!: Activity<M, L>;
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
  async init(
    ctx: this['Context'],
    opts: { force: boolean } = { force: false },
  ): Promise<boolean> {
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

  async #refreshToken(ctx: this['Context'], force = false): Promise<void> {
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
    ctx: this['Context'],
    athleteId?: Schema.AthleteId,
  ): Promise<Schema.DetailedAthlete> {
    await this.#refreshToken(ctx);
    let url = STRAVA_URL.athlete;
    if (isStravaId(athleteId)) {
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
      ctx.log.error.warn('Failed to get athlete').error(resp.statusText).emit();
      throw new Error('Failed to retrieve athlete ' + athleteId);
    }

    const data: unknown = await resp.json();

    if (isDetailedAthlete(data)) {
      return data;
    }

    throw new Error('Invalid athlete data returned');
  }

  /**
   * Retrieves a list of activities for the logged in athlete.
   *
   * This method will automatically handle token refreshes if necessary.
   *
   * @param ctx The application context for logging.
   * @param options Options for retrieving activities.
   * @returns A promise that resolves to an array of activities.
   */
  public async getActivities(
    ctx: this['Context'],
    options: Strava.ActivityOpts,
  ): Promise<this['Activity'][]> {
    await this.#refreshToken(ctx);
    const url = new URL(STRAVA_URL.activities);
    // if (_.isPosInteger(options.athleteId)) {
    //   url = new URL(url.toString() + '/' + options.athleteId);
    // }

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
        ctx.log.error.error('Failed to get activities:').error(resp.statusText).path(url.toString())
          .emit();
        throw new Error(`Failed to get activities: ${resp.statusText}`);
      }

      const data: unknown = await resp.json();

      if (isSummaryActivityArray(data)) {
        return data.map((item) => {
          const activity = new Activity<M, L>(item);
          activity.api = this;
          return activity;
        });
      }

      throw new Error(
        'Invalid activities return value: Expected an array of SummaryActivity objects.',
      );
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
    ctx: this['Context'],
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
      ctx.log.error.error('Failed to retrieved starred segments').error(resp.statusText).emit();
      return;
    }

    const data: unknown = await resp.json();

    if (isSummarySegmentArray(data)) {
      ctx.log.info.h2('Retrieved').count(data.length).h2('starred segments for page').value(page)
        .ewt(m0);
      data.forEach((item) => {
        accum.push(item);
      });
      if (data.length >= perPage) {
        return this.getStarredSegments(ctx, accum, page + 1);
      }
      return Promise.resolve();
    }

    throw new Error('Invalid starred segments data returned');
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
    ctx: this['Context'],
    activity: Schema.SummaryActivity,
  ): Promise<Schema.DetailedActivity> {
    await this.#refreshToken(ctx);
    const url = STRAVA_URL.detailedActivity + '/' + activity.id;

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
        throw new Error(
          `Failed to get detailed activity: ${resp.status} ${resp.statusText} - ${errorText}`,
        );
      }

      const data: unknown = await resp.json();

      if (isDetailedActivity(data)) {
        return data;
      }

      throw new Error('Invalid DetailedActivity return value');
    } catch (error: unknown) {
      const err = _.asError(error);
      err.message = `getActivity id='${activity.id}' ${err.message} (${activity.toString()})`;
      throw err;
    }
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
    ctx: this['Context'],
    source: 'activities' | 'segments',
    streamTypes: Schema.StreamKeyType[],
    objId: Schema.ActivityId | Schema.SegmentId,
    name: string,
  ): Promise<Strava.Coord[]> {
    const query: Dict = {
      keys: streamTypes,
      key_by_type: ' ',
    };
    const m0 = ctx.log.mark();
    try {
      const resp: Partial<Schema.StreamSet> = await this.getStreams(ctx, source, objId, query);
      if (hasLatLngData(resp)) {
        const results = Strava.CoordData[];
        for( let idx=0; idx<resp.latlng.data.length ) {
          const item: Partial<CoordData> = {};
        }
        if (streamTypes.length === 1 && streamTypes[0] === Schema.StreamKeys.LatLng) {
          return resp.latlng.data as Strava.Coord[];
        } else {
        }
      }
      ctx.log.info.h2('Get').value(name).h2('did not contain unknown coordinates').ewt(m0);
      return [];
    } catch (error: unknown) {
      const err = _.asError(error);
      const errorMsg = err.message;

      // Handle 404 errors silently - some segments don't have coordinate data
      if (errorMsg.includes('404')) {
        // Don't log 404s - they're expected for some segments
        return [];
      }

      // Handle 429 rate limit errors with a warning (no stack trace)
      if (errorMsg.includes('429')) {
        ctx.log.warn.text('Rate limit exceeded fetching coordinates for').value(name).emit();
        return [];
      }

      // Log other errors with full details
      ctx.log.error.h2('Get').value(name).h2('coordinates').err(err).ewt(m0);
      return [];
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
    ctx: this['Context'],
    source: 'activities' | 'segments',
    objId: Schema.ActivityId | Schema.SegmentId,
    options: Strava.Query,
  ): Promise<Partial<Schema.StreamSet>> {
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

    const data: unknown = await resp.json();

    // Strava API returns an array when key_by_type is empty/false,
    // or an object when key_by_type=true
    if (isStreamArray(data)) {
      // Convert array format to object format: [{ type: 'latlng', data: [...] }] -> { latlng: { type: 'latlng', data: [...] } }
      const result: Record<string, Schema.Stream | Schema.LatLngStream> = {};
      for (const stream of data) {
        result[stream.type] = stream;
      }
      return result as Partial<Schema.StreamSet>;
    }

    if (isStreamSet(data)) {
      return data;
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
  public async getSegment(
    ctx: this['Context'],
    segmentId: Schema.SegmentId,
  ): Promise<Schema.SummarySegment> {
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

    const data: unknown = await resp.json();

    if (isSummarySegment(data)) {
      return data;
    }

    throw new Error('Invalid segment data returned');
  }

  /**
   * Retrieves the efforts for a specific segment.
   *
   * @param ctx The application context for logging.
   * @param segmentId The ID of the segment.
   * @param params Additional query parameters for the request.
   * @returns A promise that resolves to an array of segment efforts.
   */
  public async getSegmentEfforts(
    ctx: this['Context'],
    segmentId: Schema.SegmentId,
    params: Strava.Query,
  ): Promise<Schema.DetailedSegmentEffort[]> {
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
      throw new Error(
        `Failed to get segment efforts: ${resp.status} ${resp.statusText} - ${errorText}`,
      );
    }

    const data: unknown = await resp.json();

    if (isSegmentEffortArray(data)) {
      return data;
    }

    throw new Error('Invalid segment efforts data returned');
  }
}
