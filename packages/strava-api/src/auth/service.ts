import { DateEx } from '@epdoc/datetime';
import type { EpochMilliseconds, EpochSeconds } from '@epdoc/duration';
import { _ } from '@epdoc/type';
import type { Context as OakContext } from '@oak/oak';
import { Application } from '@oak/oak/application';
import { Router } from '@oak/oak/router';
import { open } from '@opensrc/deno-open';
import { assert } from '@std/assert';
import type * as Ctx from '../context.ts';
import type { Oauth2Code } from './types.ts';

type Response = {
  expiry_date?: EpochMilliseconds;
};

type cbFunction = () => void;

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
  /** Controller to gracefully shut down the Oak server. */
  abortController: AbortController | undefined;
  /** Holds the final result of the authentication flow (resolve or reject message). */
  result: {
    resolve?: string;
    reject?: string;
  } = {};

  /**
   * @param {IOauth2Api} api - An object conforming to the `IOauth2Api` interface,
   *   which will be used to get the authorization URL and exchange the code for tokens.
   */
  constructor() {
  }

  /**
   * Initiates the entire authentication process.
   *
   * This is the main public method to start the flow. It returns a promise that
   * resolves with a success message or rejects with an error message upon completion.
   *
   * @param {Ctx.IBare | undefined} ctx - The application context for logging.
   * @returns {Promise<string>} A promise that resolves with a success message or rejects with an error.
   */
  runAuthWebPage(ctx: Ctx.IBare<M, L>): Promise<string> {
    assert(ctx.api, 'Strava API not initialized');
    return new Promise((resolve, reject) => {
      const cb: cbFunction = async () => {
        await this.close();
        if (this.result.resolve) {
          resolve(this.result.resolve);
        } else if (this.result.reject) {
          reject(new Error(this.result.reject));
        }
      };

      ctx && ctx.log.info.h2('Authorization required. Opening web authorization page').emit();
      const authUrl = ctx.api!.getAuthUrl();
      this.start(ctx, authUrl, cb);
      return open(authUrl).then(() => {
        ctx.log.info.text('Authorization page is open in your browser and waiting your response').emit();
      });
    });
  }

  /**
   * Sets up the Oak server routes and starts listening for the redirect from Google.
   *
   * @param {Ctx.IBare | undefined} ctx - The application context for logging.
   * @param {Url} authUrl - The Google authorization URL to which the user will be directed.
   * @param {cbFunction} cb - The callback function to execute once the flow is complete.
   */
  start(ctx: Ctx.IBare<M, L>, authUrl: string, cb: cbFunction): void {
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
            await ctx.api!.requestToken(ctx, code);
            const seconds: EpochSeconds | undefined = ctx.api?.creds.expiresAt;
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
   * @param {Ctx.IBare} [ctx] - The application context for logging.
   */
  async close(ctx?: Ctx.IBare<M, L>): Promise<void> {
    if (this.abortController) {
      await _.delayPromise(1000);
      this.abortController.abort();
      ctx && ctx.log.debug.text('Server closed').emit();
    }
    this.abortController = undefined;
  }
}
