import { DateEx } from '@epdoc/datetime';
import { type EpochMilliseconds, type EpochSeconds, humanize } from '@epdoc/duration';
import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import type { ClientCreds } from '@jpravetz/strava-api';
import type { Context as OakContext } from '@oak/oak';
import { Application } from '@oak/oak/application';
import { Router } from '@oak/oak/router';
import { open } from '@opensrc/deno-open';
import { assert } from '@std/assert';
import type * as Ctx from '../context.ts';
import type * as Strava from '../types.ts';
import { StravaCreds } from './creds.ts';
import type { Oauth2Code } from './types.ts';

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

type Response = {
  expiry_date?: EpochMilliseconds;
};

type cbFunction = () => void;

function isClientCreds(val: unknown): val is Strava.ClientCreds {
  return (_.isDict(val) && _.isPosInteger(val.id) && _.isString(val.secret)) ? true : false;
}

/**
 * Manages the OAuth2 authentication flow for the Strava API.
 *
 * This class orchestrates the process of obtaining and refreshing access tokens. It can be initialized with client
 * credentials from various sources and will handle the user authentication flow by starting a local web server and
 * opening the user's browser to the Strava authorization page.
 */
export class AuthService {
  #client?: ClientCreds;
  clientCredSrc: Strava.ClientCredSrc[];
  #creds: StravaCreds;
  /** Controller to gracefully shut down the Oak server. */
  abortController: AbortController | undefined;
  /** Holds the final result of the authentication flow (resolve or reject message). */
  result: {
    resolve?: string;
    reject?: string;
  } = {};

  /**
   * Constructs a new `AuthService` instance.
   *
   * @param credsFile The file path or `FS.File` instance for storing user authentication tokens. This file will be used to
   * persist the credentials across sessions.
   * @param clientCreds The Strava application credentials. This can be a single `ClientCredSrc` object or an array of them,
   * allowing for flexible configuration from environment variables, files, or direct objects.
   */
  constructor(
    credsFile: FS.FilePath | FS.File,
    clientCreds: Strava.ClientCredSrc | Strava.ClientCredSrc[],
  ) {
    this.clientCredSrc = _.isArray(clientCreds) ? clientCreds : [clientCreds];
    this.#creds = new StravaCreds(credsFile);
  }

  /**
   * Initializes the authentication service.
   *
   * This is the main entry point for authenticating the client. It performs the following steps:
   * 1. Initializes the client credentials by loading them from the configured sources.
   * 2. Reads the user credentials from the file specified in the constructor.
   * 3. If the credentials exist and are valid, it does nothing.
   * 4. If the credentials exist but are expired, it attempts to refresh them using the refresh token.
   * 5. If no credentials exist or they cannot be refreshed, it initiates the web-based authentication flow.
   *
   * The user does not need to call `initClientCreds` manually. This method handles the entire authentication process.
   *
   * @param ctx The application context for logging.
   * @param opts Options for initialization.
   * @param opts.force If `true`, the web-based authentication flow will be initiated even if the current token is valid.
   * @returns A promise that resolves to `true` if authentication is successful, `false` otherwise.
   */
  async init(
    ctx: Ctx.IContext,
    opts: { force: boolean } = { force: false },
  ): Promise<boolean> {
    await this.#initClientCreds(ctx);
    const m0 = ctx.log.mark();
    ctx.log.verbose.h2('Authenticating Strava API ...').emit();
    ctx.log.indent();
    await this.#creds.read();
    await this.refreshToken(ctx, opts.force);
    const hasAuth = this.#creds.isValid();
    if (hasAuth && opts.force !== true) {
      await this.#logAuthStatus(ctx, m0);
      ctx.log.outdent();
      return true;
    }

    const result = await this.runAuthWebPage(ctx as Ctx.IContext, m0);
    ctx.log.outdent();
    return result;
  }

  /**
   * Initializes the client credentials by loading them from the configured sources.
   *
   * This method iterates through the `clientCredSrc` array and attempts to load the client credentials from each source
   * until it is successful. The sources are tried in the order they are provided in the array.
   *
   * @param ctx The application context for logging.
   * @throws {Error} If the client credentials cannot be loaded from any of the configured sources.
   */
  async #initClientCreds(ctx: Ctx.IContext) {
    let src: Strava.ClientCredSrc | undefined = this.clientCredSrc.shift();
    while (!isClientCreds(this.#client) && src) {
      if ('creds' in src && isClientCreds(src.creds)) {
        this.#client = src.creds;
      } else if ('path' in src) {
        const clientConfig = await new FS.File(src.path).readJson<Strava.ClientConfig>();
        if (clientConfig && isClientCreds(clientConfig.client)) {
          this.#client = clientConfig.client;
        }
      } else if ('env' in src) {
        const sId: string = (src.env === true) ? 'STRAVA_CLIENT_ID' : src.env.id;
        const sSecret: string = (src.env === true) ? 'STRAVA_CLIENT_SECRET' : src.env.secret;
        if (_.isString(sId) && _.isString(sSecret)) {
          const id = Deno.env.get(sId);
          const secret = Deno.env.get(sSecret);
          if (_.isString(id) && _.isString(secret) && /^\d+$/.test(id)) {
            this.#client = { id: _.asInt(id), secret: secret };
          }
        }
      }
      src = this.clientCredSrc.shift();
    }
    if (!isClientCreds(this.#client)) {
      const s: string[] = [
        'Please set:',
        '  export STRAVA_CLIENT_ID="your_client_id"',
        '  export STRAVA_CLIENT_SECRET="your_client_secret"',
        'Or create ~/.strava/clientapp.secrets.json with:',
        '{',
        '  "description": "Strava API credentials",',
        '  "client": {',
        '    "id": "your_client_id",',
        '    "secret": "your_client_secret"',
        '  }',
        '}',
        'Get credentials at: https://www.strava.com/settings/api',
      ];
      ctx.log.error.error('Missing Strava API credentials.').warn(s.join('\n')).emit();
      throw new Error('Missing Strava API Credentials');
    }
  }

  /**
   * Returns the `StravaCreds` instance, which manages the user authentication credentials.
   *
   * This can be used to directly access the user's credentials, for example to get the access token.
   */
  get creds(): StravaCreds {
    return this.#creds;
  }

  get client(): ClientCreds {
    assert(
      this.#client && this.#client.id && this.#client.secret,
      'Attempting to access client ID when client ID has not yet been set',
    );
    return this.#client;
  }

  /**
   * Generates the Strava authorization URL.
   *
   * This URL is used to redirect the user to the Strava website to grant permission to the application.
   *
   * @param options Options for generating the URL.
   * @returns The authorization URL.
   */
  public getAuthUrl(options: Strava.AuthUrlOpts = {}): string {
    const opts: Strava.AuthUrlOpts = Object.assign(defaultAuthOpts, options);

    return (
      `${STRAVA_URL.authorize}?client_id=${this.client!.id}` +
      `&redirect_uri=${encodeURIComponent(opts.redirectUri as string)}` +
      `&scope=${opts.scope}` +
      `&state=${opts.state}` +
      `&approval_prompt=${opts.approvalPrompt}` +
      `&response_type=code`
    );
  }

  /**
   * Logs the current authentication status, including token expiration.
   * @private
   */
  #logAuthStatus(ctx: Ctx.IContext, mark: string): Promise<boolean> {
    const delta = this.#creds.expiresAt - new Date().getTime();
    ctx.log.debug.h2('Authorization')
      .if(delta > 0).h2('is still valid, expires').else().h2('has expired').endif()
      .value(humanize(delta), true).ewt(mark);
    return Promise.resolve(true);
  }

  /**
   * Exchanges an authorization code for an access token and refresh token.
   *
   * This method is called after the user has granted permission to the application and Strava has redirected them
   * back to the application with an authorization code.
   *
   * @param ctx The application context for logging.
   * @param code The authorization code.
   * @returns A promise that resolves to `true` if the token is successfully requested, `false` otherwise.
   */
  async requestToken(ctx: Ctx.IContext, code: Strava.Code): Promise<boolean> {
    const reqOpts: RequestInit = {
      method: 'POST',
      body: JSON.stringify({
        code: code,
        client_id: this.client.id,
        client_secret: this.client.secret,
        grant_type: 'authorization_code',
      }),
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
    };

    const m0 = ctx.log.mark();
    const resp = await fetch(STRAVA_URL.token, reqOpts);
    if (resp && resp.ok) {
      ctx.log.info.h2('Authorization obtained.').ewt(m0);
      const data: Strava.StravaCredsData = await resp.json();
      const m1 = ctx.log.mark();
      await this.creds.write(data);
      ctx.log.info.h2('Credentials written to local storage').path(this.creds.path).ewt(m1);
      return true;
    }
    return false;
  }

  /**
   * Refreshes the access token using the refresh token.
   *
   * This method is called automatically when an API request is made with an expired access token.
   *
   * @param ctx The application context for logging.
   * @param force If `true`, the token will be refreshed even if it is still valid.
   */
  async refreshToken(ctx: Ctx.IContext, force = false): Promise<void> {
    if (this.#creds.needsRefresh() || force) {
      if (force) {
        ctx.log.info.warn('Forcing token refresh').emit();
      } else {
        const m1 = ctx.log.mark();
        this.#logAuthStatus(ctx, m1);
      }
      const payload = {
        client_id: this.client.id,
        client_secret: this.client.secret,
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

      const m0 = ctx.log.mark();
      try {
        const resp = await fetch(STRAVA_URL.token, reqOpts);
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(
            `Failed to refresh access token: ${resp.status} ${resp.statusText} - ${errorText}`,
          );
        }
        // this.#data.expires_at;
        ctx.log.info.h2('Refreshed Access Token.').ewt(m0);
        const data: Strava.StravaCredsData = await resp.json();
        await this.creds.write(data);
      } catch (error: unknown) {
        const err = _.asError(error);
        ctx.log.info.h2('Failed to refresh access token').err(err).ewt(m0);
        throw err;
      }
    }
    return Promise.resolve();
  }

  /**
   * Initiates the web-based authentication flow.
   *
   * This method starts a local web server, opens the user's browser to the Strava authorization page,
   * and handles the redirect back from Strava to obtain the authorization code.
   *
   * @param ctx The application context for logging.
   * @param mark A timestamp for logging the duration of the operation.
   * @returns A promise that resolves to `true` if the flow is successful, or rejects with an error.
   */
  runAuthWebPage(ctx: Ctx.IContext, mark: string): Promise<boolean> { // Changed ctx type to Ctx.IContext and return type to Promise<boolean>
    // assert(ctx.api, 'Strava API not initialized'); // No longer needed
    return new Promise((resolve, reject) => {
      const cb: cbFunction = () => { // Removed async as it's not needed here
        this.#close(ctx); // No await needed as close is synchronous
        if (this.result.resolve) {
          resolve(true); // Resolve with true on success
        } else if (this.result.reject) {
          reject(new Error(this.result.reject)); // Reject with error on failure
        }
      };

      ctx && ctx.log.info.h2('Authorization required. Opening web authorization page').ewt(mark);
      const authUrl = this.getAuthUrl(); // Use ctx.app! for StravaApi instance
      this.#startServer(ctx, authUrl, cb);
      return open(authUrl).then(() => {
        ctx.log.info.text('Authorization page is open in your browser and waiting your response')
          .emit();
      });
    });
  }

  /**
   * Starts the local web server to handle the OAuth2 redirect.
   *
   * The server listens on port 3000 and has two endpoints:
   * - `/`: Displays a link to the Strava authorization page.
   * - `/token`: Handles the redirect from Strava after the user has granted permission. It extracts the authorization code,
   *   exchanges it for an access token, and then shuts down the server.
   *
   * @param ctx The application context for logging.
   * @param authUrl The Strava authorization URL.
   * @param cb The callback function to execute when the flow is complete.
   */
  #startServer(ctx: Ctx.IContext, authUrl: string, cb: cbFunction): void { // Changed ctx type to Ctx.IContext
    const app = new Application();
    const router = new Router();
    this.abortController = new AbortController();

    // Initialize routes

    router.get('/token', async (otx: OakContext) => {
      if (otx) {
        const code: Oauth2Code | null = otx.request.url.searchParams.get('code');
        const err: string | null = otx.request.url.searchParams.get('error');
        let s: string = '<html><body><h1>Credential Exchange</h1>';
        if (err === 'access_denied') {
          s += '<p>Error, access denied</p>';
        } else if (code) {
          s += `<p>Authorization code: <code>${code}</code></p>`;
          try {
            await this.requestToken(ctx, code); // Use ctx.app! for StravaApi instance
            const seconds: EpochSeconds | undefined = this.#creds.expiresAt; // Use ctx.app! for StravaApi instance
            const d: string = seconds ? new DateEx(seconds).toISOLocalString() : 'Unknown';
            s += '<p>Authentication tokens retrieved.</p>';
            s += `<p>Expiry date is ${d}</p>`;
            this.result = { resolve: 'Tokens retrieved' };
          } catch (e) {
            const err = _.asError(e);
            s += `<p>Error retrieving tokens: ${err.message}</p>`;
            this.result = {
              reject: 'Could not retrieve tokens: ' + err.message,
            };
          }
        } else {
          s += '<p>No code or error found in query string</p>';
        }
        s += '<p>You may close this window and return to the command line.</p>';
        s += '</body></html>';
        otx.response.body = s;
        cb();
      }
    });

    router.get('/', (otx) => {
      otx.response.body =
        `<html><body><a href="${authUrl}">Click to authenticate</a></body></html>`;
    });

    app.use(router.routes());
    app.use(router.allowedMethods());
    // Start server

    app.listen({ port: 3000, signal: this.abortController.signal });

    ctx.log.verbose.text('Server running on port 3000').emit();
  }

  /**
   * Gracefully shuts down the local web server.
   *
   * @param ctx The application context for logging.
   */
  #close(ctx?: Ctx.IContext): void { // Removed async and changed return type
    if (this.abortController) {
      this.abortController.abort();
      ctx && ctx.log.debug.text('Server closed').emit();
    }
    this.abortController = undefined;
  }
}
