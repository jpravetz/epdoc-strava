import { Dict, deepCopy, isDict } from 'epdoc-util';
import fs from 'fs';
import { LineStyle } from './kml';
import { SegmentName } from './models/segment-base';
import { StravaClientSecret, isStravaClientSecret } from './strava-api';
import { StravaCreds } from './strava-creds';
import { FilePath, isFilePath, readJson } from './util';
import { BikeDef } from './bikelog';

export type ProjectSettings = {
  description?: string;
  clientSecretPath: FilePath;
  credentialsPath: FilePath;
  userSettingsPath: FilePath;
  segmentsPath: FilePath;
  lineStyles: Record<string, LineStyle>;
  aliases: Record<SegmentName, SegmentName>;
  bikes: BikeDef[];
};

export function isProjectSettings(val: any): val is ProjectSettings {
  if (isDict(val) && isFilePath(val.clientSecretPath) && isFilePath(val.credentialsPath)) {
    return true;
  }
  return false;
}

/**
 * Represents a merger of project and user settings, and is used to read and get
 * data that is referenced by these  merged files.
 */
export class Settings {
  private _filePath: FilePath;
  private _replacements: Dict;
  private _settings: ProjectSettings;

  constructor(filePath: FilePath, replacements: Dict) {
    this._filePath = filePath;
    this._replacements = replacements || {};
  }

  get lineStyles(): Record<string, LineStyle> {
    return this._settings.lineStyles;
  }

  get aliases(): Record<SegmentName, SegmentName> {
    return this._settings.aliases;
  }

  get bikes(): BikeDef[] {
    return this._settings.bikes;
  }

  credentials(): Promise<StravaCreds> {
    let creds = new StravaCreds(this._settings.credentialsPath);
    return creds.read().then((resp) => {
      return creds;
    });
  }

  clientSecret(): Promise<StravaClientSecret> {
    if (fs.existsSync(this._settings.clientSecretPath)) {
      return readJson(this._settings.clientSecretPath).then((resp) => {
        if (isStravaClientSecret(resp)) {
          return resp;
        }
      });
    }
    return Promise.resolve(null);
  }

  segments(): Promise<Dict> {
    if (fs.existsSync(this._settings.segmentsPath)) {
      return readJson(this._settings.segmentsPath).then((resp) => {
        if (isDict(resp)) {
          return resp;
        }
      });
    }
    return Promise.resolve(null);
  }

  read(): Promise<void> {
    return Promise.resolve()
      .then((resp) => {
        if (fs.existsSync(this._filePath)) {
          return readJson(this._filePath);
        }
      })
      .then((resp) => {
        if (isProjectSettings(resp)) {
          this._settings = deepCopy(resp, { replace: this._replacements });
        }
      })
      .then((resp) => {
        if (fs.existsSync(this._settings.userSettingsPath)) {
          return readJson(this._settings.userSettingsPath);
        }
      })
      .then((resp) => {
        if (isProjectSettings(resp)) {
          const userSettings = deepCopy(resp, { replace: this._replacements });
          this._settings = Object.assign({}, this._settings, userSettings);
        }
      });
  }
}
