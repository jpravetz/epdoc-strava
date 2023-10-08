import { Dict, deepCopy, isArray, isNonEmptyArray, isNonEmptyString, isPosInteger } from 'epdoc-util';
import { SummarySegment } from 'strava';
import { BasicStravaConfig } from './basic-strava-config';
import { TokenExchangeResponse } from './server';
import {
  EpochSeconds,
  FilePath,
  FolderPath,
  LogOpts,
  StravaAccessToken,
  StravaClientConfig,
  StravaClientId,
  StravaClientSecret,
  StravaRefreshToken,
} from './types';
import { readJson, writeJson } from './util';

export type BikeDef = {
  name: string;
  pattern: string;
};

type ProjectSettings = {
  description: string;
  clientSecretPath: FilePath;
  credentialsPath: FilePath;
  segmentsCachePath: FilePath;
  // lineStyles?: LineStylesDict;
  aliases: Dict;
  bikes: BikeDef[];
};

export function newStravaConfig(path: FilePath, replacements: Dict, opts: LogOpts): StravaConfig {
  return new StravaConfig(path, replacements, opts);
}

export class StravaConfig extends BasicStravaConfig {
  public client: StravaClientConfig;
  public credentials: TokenExchangeResponse;
  public summarySegments: SummarySegment[];
  public athleteId?: number;
  // accessToken: string;
  public cachePath?: FolderPath;
  private _settings: ProjectSettings;
  private _settingsPaths: FilePath[];
  private _replacements: Dict;

  constructor(path: FilePath | FilePath[], replacements: Dict, opts: LogOpts) {
    super();
    this._settingsPaths = isArray(path) ? path : [path];
    this._replacements = replacements;
  }

  private applyReplacements(s: string): string {
    Object.keys(this._replacements).forEach((key) => {
      s = s.replace('{' + key + '}', this._replacements[key]);
    });
    return s;
  }

  public async init(): Promise<void> {
    return this.read();
  }

  private async read(): Promise<void> {
    let jobs = [];
    this._settingsPaths.forEach((path) => {
      path = this.applyReplacements(path);
      let job = readJson(path).then((resp) => {
        let config = deepCopy(resp, { replace: this._replacements });
        return Promise.resolve(config);
      });
      jobs.push(job);
    });
    return Promise.all(jobs)
      .then((resp) => {
        this._settings = Object.assign(this._settings, resp);
      })
      .then((resp) => {
        return this.readCredentials();
      })
      .then((resp) => {
        return this.readClientConfig();
      });
  }

  private async readCredentials(): Promise<void> {
    if (this._settings.credentialsPath) {
      return readJson(this._settings.credentialsPath).then((resp) => {
        this.credentials = resp;
      });
    }
  }

  public updateCredentials(res: TokenExchangeResponse): Promise<void> {
    this.credentials = res;
    return this.writeCredentials();
  }

  private writeCredentials(): Promise<void> {
    return writeJson(this._settings.credentialsPath, this.credentials);
  }

  private readClientConfig(): Promise<void> {
    return Promise.resolve()
      .then((resp) => {
        if (this._settings.clientSecretPath) {
          return readJson(this._settings.clientSecretPath).then((resp) => {
            this.client = resp;
          });
        }
      })
      .then((resp) => {
        if (!this.client || !isPosInteger(this.client.id) || !isNonEmptyString(this.client.secret)) {
          const id = parseInt(process.env.STRAVA_CLIENT_ID, 10);
          const secret = process.env.STRAVA_CLIENT_SECRET;
          if (isPosInteger(id) && isNonEmptyString(secret)) {
            this.client = {
              id: id,
              secret: secret,
            };
          }
        }
      });
  }

  public getSummarySegmentCache(): Promise<SummarySegment[]> {
    return Promise.resolve().then((resp) => {
      if (!isNonEmptyArray(this.summarySegments)) {
        return this.readSummarySegmentCache();
      }
      return Promise.resolve(this.summarySegments);
    });
  }

  private readSummarySegmentCache(): Promise<SummarySegment[]> {
    if (this._settings.segmentsCachePath) {
      return readJson(this._settings.segmentsCachePath).then((resp) => {
        this.summarySegments = resp;
        return Promise.resolve(this.summarySegments);
      });
    }
  }

  public updateSummarySegmentCache(summarySegments: SummarySegment[]): Promise<SummarySegment[]> {
    this.summarySegments = this.summarySegments;
    return this.writeSummarySegmentCache();
  }

  private writeSummarySegmentCache(): Promise<SummarySegment[]> {
    return writeJson(this._settings.segmentsCachePath, this.summarySegments).then((resp) => {
      return Promise.resolve(this.summarySegments);
    });
  }

  get clientId(): StravaClientId {
    return this.client.id;
  }
  get clientSecret(): StravaClientSecret {
    return this.client.secret;
  }
  get accessToken(): StravaAccessToken {
    return this.credentials.access_token;
  }
  get refreshToken(): StravaRefreshToken {
    return this.credentials.refresh_token;
  }
  get expiresAt(): EpochSeconds {
    return this.credentials.expires_at;
  }
  get tokenType(): string {
    return this.credentials.token_type;
  }
  get summarySegmentsAreCached(): boolean {
    return false;
  }

  get bikes(): BikeDef[] {
    return this._settings.bikes;
  }

  get aliases(): Dict {
    return this._settings.aliases;
  }

  get segmentsCachePath(): FilePath {
    return this._settings.segmentsCachePath;
  }

  // get lineStyles(): LineStylesDict {
  //   return this._settings.lineStyles;
  // }
}
