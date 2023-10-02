import { Dict } from 'epdoc-util';
import { BikeDef } from './bikelog';
import { SegmentCacheDict } from './segment-cache-file';
import { AliasesDict, LineStylesDict, Settings } from './settings';
import { StravaClientSecret, isStravaClientSecret } from './strava-api';
import { StravaCreds } from './strava-creds';
import { FilePath, FolderPath, LogOpts } from './util';

export class StravaConfig {
  public client: StravaClientSecret;
  public credentials: StravaCreds;
  public segments: SegmentCacheDict;
  public athleteId?: number;
  // accessToken: string;
  public cachePath?: FolderPath;
  private _settings: Settings;

  constructor(path: FilePath, replacements: Dict, opts: LogOpts) {
    this._settings = new Settings(path, replacements, opts);
  }

  async read(): Promise<StravaConfig> {
    return Promise.resolve()
      .then((resp) => {
        return this._settings.read();
      })
      .then((resp) => {
        return this._settings.clientSecret();
      })
      .then((resp) => {
        this.client = resp;
        if (!isStravaClientSecret(this.client)) {
          return Promise.reject(new Error('Config did not load client id and secret'));
        }
        return this.readCredentials();
      })
      .then((resp) => {
        return Promise.resolve(this);
      });
  }

  readCredentials(): Promise<void> {
    return this._settings.credentials().then((resp) => {
      this.credentials = resp;
    });
  }

  get bikes(): BikeDef[] {
    return this._settings.bikes;
  }

  get aliases(): AliasesDict {
    return this._settings.aliases;
  }

  get segmentsCachePath(): FilePath {
    return this._settings.segmentsCachePath;
  }

  get lineStyles(): LineStylesDict {
    return this._settings.lineStyles;
  }
}
