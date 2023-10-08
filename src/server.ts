import { isDict, isNonEmptyString } from 'epdoc-util';
import https from 'https';
import Koa from 'koa';
import Router from 'koa-router';
import { SummaryAthlete } from 'strava';
import { BasicStravaConfig } from './basic-strava-config';
import {
  EpochSeconds,
  LogFunctions,
  LogOpts,
  Seconds,
  StravaAccessToken,
  StravaCode,
  StravaRefreshToken,
  isEpochSeconds,
} from './types';

const STRAVA_URL_PREFIX = process.env.STRAVA_URL_PREFIX || 'https://www.strava.com';
// const STRAVA_API_PREFIX = STRAVA_URL_PREFIX + '/api/v3';
const STRAVA_PATH = {
  token: '/oauth/token',
};
const STRAVA_URL = {
  authorize: STRAVA_URL_PREFIX + '/oauth/authorize',
  token: STRAVA_URL_PREFIX + STRAVA_PATH.token,
  // athlete: STRAVA_API_PREFIX + '/athlete',
  // gear: STRAVA_API_PREFIX + '/gear',
  // picture: STRAVA_API_PREFIX + '/athlete/picture',
  // activities: STRAVA_API_PREFIX + '/activities',
  // starred: STRAVA_API_PREFIX + '/segments/starred',
};

export type OpenUrlFunction = (target: string) => Promise<any>;
export type ServerOpts = LogOpts & {
  open: OpenUrlFunction;
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

export type TokenExchangeResponse = {
  token_type: string;
  expires_at: EpochSeconds;
  expires_in: Seconds;
  refresh_token: StravaRefreshToken;
  access_token: StravaAccessToken;
  athlete: SummaryAthlete;
};

export function isTokenExchangeResponse(val: any): val is TokenExchangeResponse {
  if (
    isDict(val) &&
    isEpochSeconds(val.expire_at) &&
    isNonEmptyString(val.refresh_token) &&
    isNonEmptyString(val.access_token) &&
    val.token_type === 'Bearer'
  ) {
    return true;
  }
  return false;
}

type RequestParams = {
  query?: Record<string, any>;
  body?: Record<string, any> | any;
  headers?: Record<string, any>;
  access_token?: string;
};

export class Server {
  config: BasicStravaConfig;
  server: any;
  result: {
    resolve?: string;
    reject?: string;
  } = {};
  private _log: LogFunctions;
  private _openUrl: OpenUrlFunction;

  constructor(config: BasicStravaConfig, opts: ServerOpts) {
    this.config = config;
    this._log = opts.log;
    this._openUrl = opts.open;
  }

  public getAuthorizationUrl(options: AuthorizationUrlOpts = {}): string {
    if (!this.config.clientId) {
      throw new Error('A client ID is required.');
    }
    const opts = Object.assign(defaultAuthOpts, options);
    return (
      `${STRAVA_URL.authorize}?client_id=${this.config.clientId}` +
      `&redirect_uri=${encodeURIComponent(opts.redirectUri)}` +
      `&scope=${opts.scope}` +
      `&state=${opts.state}` +
      `&approval_prompt=${opts.approvalPrompt}` +
      `&response_type=code`
    );
  }

  /**
   * Given a code, now exchange that for new access and refresh tokens
   * @param code
   * @returns
   */
  private async tokenExchange(code: StravaCode): Promise<void> {
    const opts = {
      hostname: 'www.strava.com',
      path: STRAVA_PATH.token,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };
    const payload = {
      code: code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'authorization_code',
    };
    let buf: Buffer = Buffer.alloc(1024);

    return new Promise((resolve, reject) => {
      const req = https.request(opts, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          buf += chunk;
        });
        res.on('end', () => {
          try {
            const resp = buf.toJSON();
            resolve(resp);
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on('error', (err) => {
        reject(err);
      });
      req.write(JSON.stringify(payload));
      req.end();
    })
      .then((resp) => {
        if (isTokenExchangeResponse(resp)) {
          return this.config.updateCredentials(resp);
        } else {
          return Promise.reject(new Error('Invalid token exchange response: ' + JSON.stringify(resp)));
        }
      })
      .then((resp) => {
        this._log.info('Credentials written to local storage');
      });
  }

  public async run() {
    return new Promise((resolve, reject) => {
      const app = new Koa();
      const router = new Router();
      let authOpts = {
        redirectUri: 'http://localhost:3000/token',
      };
      const authUrl = this.getAuthorizationUrl(authOpts);

      router.get('/token', async (ctx) => {
        const code: StravaCode = ctx.query.code as string;
        const err: string = ctx.query.error as string;

        let s = '<html><body><h1>Credential Exchange</h1>';
        return Promise.resolve()
          .then((resp) => {
            if (err === 'access_denied') {
              s += '<p>Error, access denied</p>';
            } else {
              s += `<p>Authorization code: ${code}</p>`;
              return this.tokenExchange(code)
                .then((resp) => {
                  s += '<p>Tokens exchanged. You may now close this browser window.</p>';
                  s += '</body></html>';
                  ctx.body = s;
                  this.result = { resolve: 'Tokens retrieved and saved to file' };
                })
                .catch((err) => {
                  s += `<p>Error exchanging tokens: ${err.message}</p>`;
                  s += '</body></html>';
                  ctx.body = s;
                  this.result = { reject: 'Could not retrieve tokens: ' + err.message };
                });
            }
          })
          .then((resp) => {
            s += '</body></html>';
            ctx.body = s;
          });
      });

      // This code was causing a problem when I updated koa, and is not needed,
      // so I am commenting it out. router.get('/*', ctx => { ctx.body =
      // `<html><body><a href="${authUrl}">Click to
      // authenticate</a></body></html>`;
      // });

      app.use(router.routes());

      let server = app.listen(3000);

      this._log.info('Server running on port 3000');

      this._openUrl(authUrl).then((resp) => {
        this._log.info('browser is open');
      });

      let timer = setInterval(() => {
        this._log.info('Waiting ...');
        if (this.result.resolve) {
          clearInterval(timer);
          timer = undefined;
          this._log.info('Closing server ' + this.result.resolve);
          this.close();
          resolve(this.result.resolve);
        } else if (this.result.reject) {
          clearInterval(timer);
          timer = undefined;
          this._log.info('Closing server ' + this.result.reject);
          this.close();
          reject(new Error(this.result.reject));
        }
      }, 2000);
    });
  }

  close() {
    if (this.server) {
      this.server.close();
    }
    this.server = undefined;
  }
}
