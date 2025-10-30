import { isNumber } from 'epdoc-util';
import { EpochSeconds, readJson, Seconds, writeJson } from './util.ts';

export type StravaCredsData = {
  token_type: string;
  expires_at: EpochSeconds;
  expires_in: EpochSeconds;
  refresh_token: string;
  access_token: string;
  athlete: {
    id?: string;
    username?: string;
    [key: string]: any;
  };
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
  private data: StravaCredsData = defaultStravaToken;
  private path: string;

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

  public isValid(t: Seconds = 0): boolean {
    const tLimit: EpochSeconds = Date.now() / 1000 + t;
    return this.data && this.data.token_type === 'Bearer' && this.data.expires_at > tLimit;
  }

  public needsRefresh(t: Seconds = 2 * 60 * 60): boolean {
    return !this.isValid(t);
  }

  public static validCredData(val: any): val is StravaCredsData {
    return val && val.token_type === 'Bearer' && isNumber(val.expires_at);
  }

  public read(): Promise<void> {
    return readJson(this.path)
      .then(resp => {
        if (StravaCreds.validCredData(resp)) {
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

  public write(data: any): Promise<void> {
    if (StravaCreds.validCredData(data)) {
      this.data = data;
      return writeJson(this.path, this.data);
    } else {
      throw new Error('No token data to write');
    }
  }
}
