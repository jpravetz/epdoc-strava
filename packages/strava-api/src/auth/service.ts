import { DateEx } from '@epdoc/datetime';
import type { EpochMilliseconds, EpochSeconds } from '@epdoc/duration';
import { duration } from '@epdoc/duration';
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
  return !!(_.isDict(val) && _.isPosInteger(val.id) && _.isString(val.client));
}

/**
 * Manages the OAuth2 authentication flow by launching a local web server
 * and opening the user's browser to grant permissions.
 *
 * This class orchestrates the following steps:
 * 1. Starts a local Oak web server on port 3000.
 * 2. Opens the Google authorization URL in the user's default browser.
 * 3. After the user grants consent, Google redirects back to `http://localhost:3000/token`.
 * 4. The `/token` endpoint receives the authorization code.
 * 5. The code is exchanged for access and refresh tokens using the provided `IOauth2Api`.
 * 6. The local server is shut down, and the flow completes.
 */
export class AuthService<M extends Ctx.MsgBuilder, L extends Ctx.Logger<M>> {
  client?: ClientCreds;
  id?: Strava.ClientId;
  secret?: Strava.ClientSecret;
  clientCredSrc: Strava.ClientCredSrc[];
  #creds: StravaCreds;
  /** Controller to gracefully shut down the Oak server. */
  abortController: AbortController | undefined;
  /** Holds the final result of the authentication flow (resolve or reject message). */
  result: {
    resolve?: string;
    reject?: string;
  } = {};

  // #api: StravaApi<M, L>; // Private property to hold the StravaApi instance - removed as per user instruction

  /**
   * The AuthService now expects the StravaApi instance to be available via `ctx.app`.
   */
  constructor(clientCreds: Strava.ClientCredSrc | Strava.ClientCredSrc[], credsFile: FS.FilePath) {
    this.clientCredSrc = _.isArray(clientCreds) ? clientCreds : [clientCreds];
    // this.id = clientConfig.id || _.asInt(Deno.env.get('STRAVA_CLIENT_ID'), 10);
    // this.secret = clientConfig.secret || Deno.env.get('STRAVA_CLIENT_SECRET') || '';
    this.#creds = new StravaCreds(credsFile);
  }

  async init(ctx: Ctx.IContext<M, L>, opts: { force: boolean } = { force: false }): Promise<boolean> {
    const m0 = ctx.log.mark();
    ctx.log.verbose.h2('Authenticating Strava API ...').emit();
    ctx.log.indent();
    await this.#creds.read();
    await this.refreshToken(ctx, opts.force);
    const hasAuth = this.#creds.isValid();
    if (hasAuth && opts.force !== true) {
      await this.logAuthStatus(ctx, m0);
      ctx.log.outdent();
      return true;
    }

    const result = await this.runAuthWebPage(ctx as Ctx.IContext<M, L>, m0);
    ctx.log.outdent();
    return result;
  }

  async initClientCreds(ctx: Ctx.IContext<M, L>) {
    let src: Strava.ClientCredSrc | undefined = this.clientCredSrc.shift();
    while (!isClientCreds(this.client) && src) {
      if ('creds' in src && isClientCreds(src.creds)) {
        this.client = src.creds;
      } else if ('path' in src) {
        const clientConfig = await new FS.File(src.path).readJson<Strava.ClientConfig>();
        if (clientConfig && isClientCreds(clientConfig.client)) {
          this.client = clientConfig.client;
        }
      } else if ('env' in src) {
        const sId: string = (src.env === true) ? 'STRAVA_CLIENT_ID' : src.env.id;
        const sSecret: string = (src.env === true) ? 'STRAVA_CLIENT_SECRET' : src.env.secret;
        if (_.isString(sId) && _.isString(sSecret)) {
          const id = _.asInt(Deno.env.get(sId));
          const secret = Deno.env.get(sSecret);
          if (_.isString(secret) && _.isPosInteger(id)) {
            this.client = { id: id, secret: secret };
          }
        }
      }
      src = this.clientCredSrc.shift();
    }
    if (!isClientCreds(this.client)) {
      ctx.log.error.error('Missing Strava API credentials').emit();
      const s: string[] = [
        'Missing Strava API credentials. Please set:',
        '  export STRAVA_CLIENT_ID="your_client_id"',
        '  export STRAVA_CLIENT_SECRET="your_client_secret"\n',
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
      ctx.log.info.h2(s.join('\n')).emit();
      throw new Error('Missing Strava API Credentials');
    }
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
   * Logs the current authentication status, including token expiration.
   * @private
   */
  private logAuthStatus(ctx: Ctx.IContext<M, L>, mark: string): Promise<boolean> {
    const formatter = duration().narrow.fractionalDigits(3);
    const delta = this.#creds.expiresAt - new Date().getTime();
    ctx.log.debug.h2(`Authorization is still valid, expires in ${formatter.format(delta)}`).ewt(mark);
    return Promise.resolve(true);
  }

  /**
   * Exchanges code for refresh and access tokens from Strava. Writes these
   * tokens to ~/.strava/credentials.json.
   * @param code
   */
  async requestToken(ctx: Ctx.IContext<M, L>, code: Strava.Code): Promise<boolean> {
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

  async refreshToken(ctx: Ctx.IContext<M, L>, force = false): Promise<void> {
    if (this.#creds.needsRefresh() || force) {
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

      const m0 = ctx.log.mark();
      try {
        const resp = await fetch(STRAVA_URL.token, reqOpts);
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Failed to refresh access token: ${resp.status} ${resp.statusText} - ${errorText}`);
        }
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
   * Initiates the entire authentication process.
   *
   * This is the main public method to start the flow. It returns a promise that
   * resolves with a success message or rejects with an error message upon completion.
   *
   * @param {Ctx.IContext<M, L>} ctx - The application context for logging.
   * @returns {Promise<boolean>} A promise that resolves with true for success or rejects with an error.
   */
  runAuthWebPage(ctx: Ctx.IContext<M, L>, mark: string): Promise<boolean> { // Changed ctx type to Ctx.IContext and return type to Promise<boolean>
    // assert(ctx.api, 'Strava API not initialized'); // No longer needed
    return new Promise((resolve, reject) => {
      const cb: cbFunction = () => { // Removed async as it's not needed here
        this.close(ctx); // No await needed as close is synchronous
        if (this.result.resolve) {
          resolve(true); // Resolve with true on success
        } else if (this.result.reject) {
          reject(new Error(this.result.reject)); // Reject with error on failure
        }
      };

      ctx && ctx.log.info.h2('Authorization required. Opening web authorization page').ewt(mark);
      const authUrl = this.getAuthUrl(); // Use ctx.app! for StravaApi instance
      this.startServer(ctx, authUrl, cb);
      return open(authUrl).then(() => {
        ctx.log.info.text('Authorization page is open in your browser and waiting your response').emit();
      });
    });
  }

  /**
   * Sets up the Oak server routes and starts listening for the redirect from Google.
   *
   * @param {Ctx.IContext<M, L>} ctx - The application context for logging.
   * @param {Url} authUrl - The Google authorization URL to which the user will be directed.
   * @param {cbFunction} cb - The callback function to execute once the flow is complete.
   */
  startServer(ctx: Ctx.IContext<M, L>, authUrl: string, cb: cbFunction): void { // Changed ctx type to Ctx.IContext
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
      otx.response.body = `<html><body><a href="${authUrl}">Click to authenticate</a></body></html>`;
    });

    app.use(router.routes());
    app.use(router.allowedMethods());
    // Start server

    app.listen({ port: 3000, signal: this.abortController.signal });

    ctx.log.verbose.text('Server running on port 3000').emit();
  }

  /**
   * Gracefully shuts down the local web server.
   * @param {Ctx.IContext} [ctx] - The application context for logging.
   */
  close(ctx?: Ctx.IContext<M, L>): void { // Removed async and changed return type
    if (this.abortController) {
      this.abortController.abort();
      ctx && ctx.log.debug.text('Server closed').emit();
    }
    this.abortController = undefined;
  }
}
