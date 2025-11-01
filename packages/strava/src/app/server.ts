// import { serve } from "@std/http/server";
import * as Strava from './dep.ts'
import * as Ctx from '../context.ts'

// This is an old implementation that has been replaced by strava-api. Please delete once we have confirmed that this code is no longer needed because we have a working, newer implementation.

export class Server {
  strava: unknown;
  server: unknown;
  result: {
    resolve?: string;
    reject?: string;
  } = {};

  constructor(strava: Strava.Api) {
    this.strava = strava;
  }

  public async run(ctx:Ctx.Context) {
    const authOpts = { redirectUri: 'http://localhost:3000/token' };
    const authUrl = Strava.getAuthorizationUrl(authOpts);

    ctx.log.info.h2('Server running on port 3000').emit()
    ctx.log.info.h2('Opening browser for authentication...').emit()
    Deno.run({ cmd: ['open', authUrl] });

    for await (const req of serve({ port: 3000 })) {
      const url = new URL(req.url, `http://${req.headers.get('host')}`);
      const code = url.searchParams.get('code');
      const err = url.searchParams.get('error');

      let s = '<html><body><h1>Credential Exchange</h1>';
      if (err === 'access_denied') {
        s += '<p>Error, access denied</p>';
      } else {
        s += `<p>Authorization code: ${code}</p>`;
        try {
          await this.strava.requestToken(code);
          s += '<p>Tokens retrieved. Please return to command line.</p>';
        } catch (err) {
          s += `<p>Error retrieving tokens: ${err.message}</p>';
        }
      }
      s += '</body></html>';
      req.respond({ body: s });
      break;
    }
  }

  
}
