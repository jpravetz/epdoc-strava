import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { StravaApi, StravaCode } from './strava-api.ts';

export class Server {
  strava: any;
  server: any;
  result: {
    resolve?: string;
    reject?: string;
  } = {};

  constructor(strava: StravaApi) {
    this.strava = strava;
  }

  public async run() {
    const authOpts = {
      redirectUri: 'http://localhost:3000/token'
    };
    const authUrl = this.strava.getAuthorizationUrl(authOpts);

    console.info('Server running on port 3000');
    console.info('Opening browser for authentication...');
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
