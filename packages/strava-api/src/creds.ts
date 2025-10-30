import type { EpochSeconds, Seconds } from '@epdoc/duration';
import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import type { StravaCredsData } from './types.ts';

const defaultStravaToken: StravaCredsData = {
  expires_at: 0,
  expires_in: 0,
  athlete: {},
};

export function isValidCredData(val: unknown): val is StravaCredsData {
  return _.isDict(val) && val.token_type === 'Bearer' && _.isNumber(val.expires_at);
}

export class StravaCreds {
  #data: StravaCredsData = defaultStravaToken;
  #fsCredsFile: FS.File;

  constructor(tokenFile: FS.File) {
    this.#fsCredsFile = tokenFile;
  }

  get expiresAt(): EpochSeconds {
    return this.#data.expires_at;
  }

  get refreshToken(): string | undefined {
    return this.#data.refresh_token;
  }

  get accessToken(): string | undefined {
    return this.#data.access_token;
  }

  isValid(t: Seconds = 0): boolean {
    const tLimit: EpochSeconds = Date.now() / 1000 + t;
    return this.#data && this.#data.token_type === 'Bearer' && this.#data.expires_at > tLimit;
  }

  needsRefresh(t: Seconds = 2 * 60 * 60): boolean {
    return !this.isValid(t);
  }

  async read(): Promise<boolean> {
    const isFile = await this.#fsCredsFile.isFile();
    if (isFile) {
      const creds = await this.#fsCredsFile.readJson<StravaCredsData>();
      if (isValidCredData(creds)) {
        this.#data = creds;
        return true;
      } else {
        throw new FS.Err.InvalidData('Invalid credentials file');
      }
    }
    return false;
  }

  async write(data: StravaCredsData): Promise<void> {
    if (isValidCredData(data)) {
      this.#data = data;
      await this.#fsCredsFile.writeJson(this.#data);
    } else {
      throw new Error('Invalid token data');
    }
  }
}
