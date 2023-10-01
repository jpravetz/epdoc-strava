import Koa from 'koa';
import Router from 'koa-router';
import open from 'open';
import { StravaApi, StravaCode } from './strava-api';
import { LogFunctions } from './util';

export class Server {
  strava: any;
  server: any;
  result: {
    resolve?: string;
    reject?: string;
  } = {};
  private _log: LogFunctions;

  constructor(strava: StravaApi, options: { log: LogFunctions }) {
    this.strava = strava;
    this._log = options.log;
  }

  public async run() {
    return new Promise((resolve, reject) => {
      const app = new Koa();
      const router = new Router();
      let authOpts = {
        redirectUri: 'http://localhost:3000/token',
      };
      const authUrl = this.strava.getAuthorizationUrl(authOpts);

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
              return this.strava
                .getTokens(code)
                .then((resp) => {
                  s += '<p>Tokens retrieved. Please return to command line.</p>';
                  s += '</body></html>';
                  ctx.body = s;
                  this.result = { resolve: 'Tokens retrieved and saved to file' };
                })
                .catch((err) => {
                  s += `<p>Error retrieving tokens: ${err.message}</p>`;
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

      open(authUrl, { wait: true }).then((resp) => {
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
      }, 1000);
    });
  }

  close() {
    if (this.server) {
      this.server.close();
    }
    this.server = undefined;
  }
}
