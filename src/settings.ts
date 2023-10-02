import { Dict, deepCopy, isArray, isDict } from 'epdoc-util';
import fs from 'fs';
import { BikeDef } from './bikelog';
import { LineStyle } from './kml';
import { SegmentName } from './models/segment-base';
import { isSegementCacheDict } from './segment-cache-file';
import { StravaClientSecret, isStravaClientSecret } from './strava-api';
import { StravaCreds } from './strava-creds';
import { FilePath, LogFunctions, LogOpts, isFilePath, readJson } from './util';

export type ProjectSettings = {
  description?: string;
  clientSecretPath?: FilePath;
  credentialsPath?: FilePath;
  userSettingsPath?: FilePath;
  segmentsCachePath?: FilePath;
  lineStyles?: LineStylesDict;
  aliases?: AliasesDict;
  bikes?: BikeDef[];
};

export type LineStylesDict = Record<string, LineStyle>;
export type AliasesDict = Record<SegmentName, SegmentName>;

export function isLineStylesDict(val: any): val is LineStylesDict {
  return isDict(val);
}

export function isAliasesDict(val: any): val is AliasesDict {
  return isDict(val);
}

export function isProjectSettings(val: any): val is ProjectSettings {
  if (
    isDict(val) &&
    (isFilePath(val.clientSecretPath) ||
      isFilePath(val.credentialsPath) ||
      isLineStylesDict(val.lineStyles) ||
      isAliasesDict(val.aliases) ||
      isArray(val.bikes))
  ) {
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
  private _log: LogFunctions;

  constructor(filePath: FilePath, replacements: Dict, opts: LogOpts) {
    this._filePath = filePath;
    this._replacements = replacements || {};
    this._log = opts.log;
  }

  get lineStyles(): LineStylesDict {
    return this._settings.lineStyles;
  }

  get aliases(): AliasesDict {
    return this._settings.aliases;
  }

  get bikes(): BikeDef[] {
    return this._settings.bikes;
  }

  async credentials(): Promise<StravaCreds> {
    let creds = new StravaCreds(this._settings.credentialsPath, { log: this._log });
    return creds.read().then((resp) => {
      return creds;
    });
  }

  async clientSecret(): Promise<StravaClientSecret> {
    if (fs.existsSync(this._settings.clientSecretPath)) {
      return readJson(this._settings.clientSecretPath).then((resp) => {
        if (isDict(resp) && isStravaClientSecret(resp.client)) {
          return resp.client;
        }
      });
    }
    return Promise.resolve(null);
  }

  /**
   * Reads the segments cache file, if there is one.
   * @returns
   */
  async segments_deprecated(): Promise<Dict> {
    if (fs.existsSync(this._settings.segmentsCachePath)) {
      return readJson(this._settings.segmentsCachePath).then((resp) => {
        if (isSegementCacheDict(resp)) {
          return resp;
        }
      });
    }
    // Empty SegmentCacheDict
    return Promise.resolve({});
  }

  get segmentsCachePath(): FilePath {
    return this._settings.segmentsCachePath;
  }

  async read(): Promise<void> {
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
