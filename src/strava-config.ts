import { Dict } from 'epdoc-util';
import { BikeDef } from './bikelog';
import { LineStyle } from './kml';
import { SegmentName } from './models/segment-base';
import { Settings } from './settings';
import { StravaClientSecret } from './strava-api';
import { StravaCreds } from './strava-creds';
import { FilePath, FolderPath, readJson } from './util';

const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

export class StravaConfig {
  public client: StravaClientSecret;
  public credentials: StravaCreds;
  public segments: Dict;
  public athleteId?: number;
  // accessToken: string;
  public cachePath?: FolderPath;
  private _settings: Settings;

  constructor(path: FilePath, replacements: Dict) {
    this._settings = new Settings(path, replacements);
  }

  async read(): Promise<void> {
    return Promise.resolve()
      .then((resp) => {
        return this._settings.read();
      })
      .then((resp) => {
        return this._settings.clientSecret();
      })
      .then((resp) => {
        this.client = resp;
        return this._settings.credentials();
      })
      .then((resp) => {
        this.credentials = resp;
        return this._settings.segments();
      })
      .then((resp) => {
        this.segments = resp;
      });
  }

  get bikes(): BikeDef[] {
    return this._settings.bikes;
  }

  get aliases(): Record<SegmentName, SegmentName> {
    return this._settings.aliases;
  }

  get lineStyles(): Record<string, LineStyle> {
    return this._settings.lineStyles;
  }
}
