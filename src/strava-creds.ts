import { EpochSeconds, Dict, readJson, writeJson, Seconds } from './util/file';
import { isNumber, isEmpty } from 'epdoc-util';

export type StravaCredsData = {
  token_type: string;
  expires_at: EpochSeconds;
  expires_in: EpochSeconds;
  refresh_token: string;
  access_token: string;
  athlete: Dict;
};

const defaultStravaToken: StravaCredsData = {
  token_type: null,
  expires_at: 0,
  expires_in: 0,
  refresh_token: null,
  access_token: null,
  athlete: {}
};

export class StravaCreds {
  data: StravaCredsData = defaultStravaToken;
  path: string;

  constructor(tokenFile: string) {
    this.path = tokenFile;
  }

  get expiresAt(): EpochSeconds {
    return this.data.expires_at;
  }

  get refreshToken(): string {
    return this.data.refresh_token;
  }

  get accessToken(): string {
    return this.data.access_token;
  }

  areValid(t: Seconds = 2 * 60 * 60) {
    let tLimit: EpochSeconds = Date.now() / 1000 + t;
    return this.data && this.data.token_type === 'Bearer' && this.data.expires_at > tLimit;
  }

  read(): Promise<void> {
    return readJson(this.path)
      .then(resp => {
        if (resp && resp.token_type === 'Bearer' && isNumber(resp.expires_at)) {
          this.data = resp;
        } else {
          console.log('Invalid token auth response');
        }
      })
      .catch(err => {
        console.log('No local credentials cached');
        return Promise.resolve();
      });
  }

  write(data: StravaCredsData): Promise<void> {
    if (data && data.token_type === 'Bearer') {
      this.data = data;
      return writeJson(this.path, this.data);
    } else {
      throw new Error('No token data to write');
    }
  }
}
