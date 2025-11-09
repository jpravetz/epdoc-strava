import type { EpochSeconds, Seconds } from '@epdoc/duration';
import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import type { StravaCredsData } from '../types.ts';

const defaultStravaToken: StravaCredsData = {
  expires_at: 0,
  expires_in: 0,
  athlete: {},
};

/**
 * Checks if the provided data is a valid `StravaCredsData` object.
 *
 * This is a type guard that checks if the object has the required properties and that the `token_type` is 'Bearer'.
 *
 * @param val The data to validate.
 * @returns `true` if the data is a valid `StravaCredsData` object, `false` otherwise.
 */
export function isValidCredData(val: unknown): val is StravaCredsData {
  return _.isDict(val) && val.token_type === 'Bearer' && _.isNumber(val.expires_at);
}

/**
 * Manages Strava API credentials, including reading, writing, and validating them.
 *
 * This class provides a convenient way to work with Strava credentials, abstracting away the details of file I/O and
 * validation.
 */
export class StravaCreds {
  #data: StravaCredsData = defaultStravaToken;
  #fsCredsFile: FS.File;

  /**
   * Constructs a new `StravaCreds` instance.
   *
   * @param tokenFile The file path or `FS.File` instance for storing the credentials. This file will be used to
   * persist the credentials across sessions.
   */
  constructor(tokenFile: FS.FilePath | FS.File) {
    this.#fsCredsFile = tokenFile instanceof FS.File ? tokenFile : new FS.File(tokenFile);
  }

  /**
   * The expiration timestamp of the access token in epoch seconds.
   */
  get expiresAt(): EpochSeconds {
    return this.#data.expires_at;
  }

  /**
   * The refresh token used to obtain a new access token.
   */
  get refreshToken(): string | undefined {
    return this.#data.refresh_token;
  }

  /**
   * The access token used to make API requests.
   */
  get accessToken(): string | undefined {
    return this.#data.access_token;
  }

  /**
   * The file path where the credentials are stored.
   */
  get path(): FS.FilePath {
    return this.#fsCredsFile.path;
  }

  /**
   * Checks if the credentials object contains a non-empty refresh token.
   *
   * This is useful for determining if the credentials can be refreshed.
   *
   * @returns `true` if a refresh token is present and not empty, `false` otherwise.
   */
  hasRefreshToken(): boolean {
    return this.#data && _.isNonEmptyString(this.#data.refresh_token) ? true : false;
  }

  /**
   * Checks if the access token is valid and has not expired.
   *
   * An access token is considered valid if it has not expired and its `token_type` is 'Bearer'.
   *
   * @param t A buffer time in seconds. The token will be considered expired if it expires within this buffer time.
   * @param now The current time in epoch seconds. Defaults to `Date.now() / 1000`.
   * @returns `true` if the token is valid, `false` otherwise.
   */
  isValid(t: Seconds = 0, now: EpochSeconds = Date.now() / 1000): boolean {
    const tLimit: EpochSeconds = now + t;
    return this.#data && this.#data.token_type === 'Bearer' && this.#data.expires_at > tLimit;
  }

  /**
   * Checks if the access token needs to be refreshed.
   *
   * An access token needs to be refreshed if it is not valid or if it will expire within the specified refresh window.
   *
   * @param t The refresh window in seconds. Defaults to 2 hours.
   * @param now The current time in epoch seconds. Defaults to `Date.now() / 1000`.
   * @returns `true` if the token needs to be refreshed, `false` otherwise.
   */
  needsRefresh(t: Seconds = 2 * 60 * 60, now: EpochSeconds = Date.now() / 1000): boolean {
    return !this.isValid(t, now);
  }

  /**
   * Reads the credentials from the file system.
   *
   * If the file does not exist, this method will do nothing. If the file exists but contains invalid data, it will throw
   * an error.
   *
   * @returns A promise that resolves to the credentials data if the file is read successfully, otherwise `undefined`.
   * @throws {FS.Err.InvalidData} If the credentials file contains invalid data.
   */
  async read(): Promise<StravaCredsData | undefined> {
    const isFile = await this.#fsCredsFile.isFile();
    if (isFile) {
      const creds = await this.#fsCredsFile.readJson<StravaCredsData>();
      if (isValidCredData(creds)) {
        this.#data = creds;
        return creds;
      } else {
        throw new FS.Err.InvalidData('Invalid credentials file');
      }
    }
  }

  /**
   * Writes the credentials to the file system.
   *
   * This method will overwrite the existing file if it exists.
   *
   * @param data The credentials data to write.
   * @throws {Error} If the provided data is invalid.
   */
  async write(data: StravaCredsData): Promise<void> {
    if (isValidCredData(data)) {
      this.#data = data;
      await this.#fsCredsFile.writeJson(this.#data, null, 2);
    } else {
      throw new Error('Invalid token data');
    }
  }
}
