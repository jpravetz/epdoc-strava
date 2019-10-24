import Koa from 'koa';
import Router from 'koa-router';
import open from 'open';
import { StravaApi, StravaCode } from './strava-api';

export class Server {
  strava: any;

  constructor(strava: StravaApi) {
    this.strava = strava;
  }

  run() {
    return new Promise((resolve, reject) => {
      const app = new Koa();
      const router = new Router();
      let authOpts = {
        redirectUri: 'http://localhost:3000/token'
      };
      const authUrl = this.strava.getAuthorizationUrl(authOpts);

      router.get('/token', async ctx => {
        const code: StravaCode = ctx.query.code;
        const err: string = ctx.query.error;

        let s = '<html><body><h1>Credential Exchange</h1>';
        return Promise.resolve()
          .then(resp => {
            if (err === 'access_denied') {
              s += '<p>Error, access denied</p>';
            } else {
              s += `<p>Authorization code: ${code}</p>`;
              return this.strava
                .getTokens(code)
                .then(resp => {
                  s += '<p>Tokens retrieved. Please return to command line.</p>';
                  s += '</body></html>';
                  ctx.body = s;
                  resolve('Tokens retrieved and saved to file');
                })
                .catch(err => {
                  s += `<p>Error retrieving tokens: ${err.message}</p>`;
                  s += '</body></html>';
                  ctx.body = s;
                  reject(new Error('Could not retrieve tokens: ' + err.message));
                });
            }
          })
          .then(resp => {
            s += '</body></html>';
            ctx.body = s;
          });
      });

      router.get('/*', async ctx => {
        ctx.body = `<html><body><a href="${authUrl}">Click to authenticate</a></body></html>`;
      });

      app.use(router.routes());

      app.listen(3000);

      console.log('Server running on port 3000');

      open(authUrl, { wait: true }).then(resp => {
        console.log('browser is open');
      });
    });
  }
}
