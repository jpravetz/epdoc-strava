import projectConfig from './config/project.settings.json';
import { Dict, deepCopy, isDict, isNonEmptyString, isObject, isPosInteger } from 'epdoc-util';
import { StravaClientConfig, isStravaClientConfig } from './strava-api';
import { FilePath, FolderPath, isFilePath, readJson } from './util';
import { LineStyle } from './kml';
import fs from 'fs';
import { SegmentName } from './models/segment-base';
import { StravaCreds, StravaCredsData } from './strava-creds';
import { BikeDef } from './bikelog';

const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
let config: Dict = deepCopy(projectConfig, { replace: { HOME: home } });

export type ProjectSettings = {
  description?: string;
  client: FilePath;
  credentials: FilePath;
  userSettings: FilePath;
  segments: FilePath;
  lineStyles: Record<string, LineStyle>;
};

export function isProjectSettings(val: any): val is ProjectSettings {
  if (isObject(val) && isFilePath(val.client) && isFilePath(val.credentials)) {
    return true;
  }
  return false;
}

export class StravaConfig {
  public description: string;
  public client: StravaClientConfig;
  public credentials: StravaCreds;
  public segments: Dict;
  public lineStyles?: Record<string, LineStyle>;
  public athleteId?: number;
  // accessToken: string;
  public cachePath?: FolderPath;
  public bikes?: BikeDef[];
  public aliases?: Record<SegmentName, SegmentName>;
  private _filePath: FilePath;
  private _projectSettings: ProjectSettings;

  constructor(path: FilePath) {
    this._filePath = path;
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
          this._projectSettings = resp;
          this.lineStyles = resp.lineStyles;
          this.credentials = new StravaCreds(resp.credentials);
          return Promise.resolve()
            .then((resp) => {
              if (fs.existsSync(this._projectSettings.userSettings)) {
                return readJson(this._projectSettings.userSettings);
              }
            })
            .then((resp) => {
              if (isProjectSettings(resp)) {
                this._projectSettings = Object.assign({}, this._projectSettings, resp);
              }
              if (fs.existsSync(this._projectSettings.client)) {
                return readJson(this._projectSettings.client);
              }
            })
            .then((resp) => {
              if (isStravaClientConfig(resp)) {
                this.client = resp;
              }
              if (fs.existsSync(this._projectSettings.segments)) {
                return readJson(this._projectSettings.segments);
              }
            })
            .then((resp) => {
              if (isDict(resp)) {
                this.segments = resp;
              }
            });
        }
      });
  }
}
