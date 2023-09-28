import { isDict, isNonEmptyArray, isNonEmptyString, isNumber } from 'epdoc-util';
import { EpochSeconds, FilePath, isEpochSeconds, readJson, Seconds, writeJson } from './util';
import fs from 'fs';

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

export function isStravaCredsData(val: any): val is StravaCredsData {
  if (isDict(val) && isNonEmptyString(val.token_type) && isEpochSeconds(val.expires_at)) {
    return true;
  }
  return false;
}

/**
 * Strava token file containing OAUTH credentials.
 */
const defaultStravaToken: StravaCredsData = {
  token_type: null,
  expires_at: 0,
  expires_in: 0,
  refresh_token: null,
  access_token: null,
  athlete: {},
};

export class StravaCreds {
  private _data: StravaCredsData = defaultStravaToken;
  private _path: FilePath;

  constructor(tokenFile: FilePath) {
    this._path = tokenFile;
  }

  get expiresAt(): EpochSeconds {
    return this._data.expires_at;
  }

  get refreshToken(): string {
    return this._data.refresh_token;
  }

  get accessToken(): string {
    return this._data.access_token;
  }

  public areValid(t: Seconds = 2 * 60 * 60) {
    const tLimit: EpochSeconds = Date.now() / 1000 + t;
    return this._data && this._data.token_type === 'Bearer' && this._data.expires_at > tLimit;
  }

  public static validCredData(val: any): val is StravaCredsData {
    return val && val.token_type === 'Bearer' && isNumber(val.expires_at);
  }

  public async read(): Promise<void> {
    if (fs.existsSync(this._path)) {
      try {
        const resp = await readJson(this._path);
        if (StravaCreds.validCredData(resp)) {
          this._data = resp;
        } else {
          console.log('Invalid token auth response');
        }
      } catch (err) {
        console.log('No local credentials cached');
        return await Promise.resolve();
      }
    }
  }

  public async write(data: any): Promise<void> {
    if (StravaCreds.validCredData(data)) {
      this._data = data;
      return writeJson(this._path, this._data);
    } else {
      throw new Error('No token data to write');
    }
  }
}
