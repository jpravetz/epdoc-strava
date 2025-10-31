import type * as CliApp from '@epdoc/cliapp';
import type * as FS from '@epdoc/fs/fs';
import type { Dict, Integer } from '@epdoc/type';
import type { Strava } from '../dep.ts';
import type { LineStyle } from '../kml/mod.ts';

export type SegmentConfig = {
  description: string;
  alias: Dict;
  data: Dict;
};

export type CliOpts =
  & CliApp.Opts
  & Partial<{
    imperial: boolean;
    offline: boolean;
    athleteId: string;
  }>;

export type BikeId = string;

export type BikeDef = {
  name: string;
  pattern: string;
};

export type UserSettings = {
  description: string;
  // client: StravaClientConfig;
  athleteId?: Integer;
  // accessToken: string;
  cachePath?: string;
  lineStyles?: Record<string, LineStyle>;
  bikes?: BikeDef[];
  aliases?: Record<Strava.Schema.SegmentName, Strava.Schema.SegmentName>;
};

export type ConfigFile = {
  description: string;
  settings: {
    segmentsFile: FS.FilePath;
    userSettingsFile: FS.FilePath;
    credentialsFile: FS.FilePath;
    clientAppFile: FS.FilePath;
  };
};

export type ClientAppId = Integer;
export type ClientAppSecret = string;

export type ClientApp = {
  description: string;
  client: {
    id: ClientAppId;
    secret: ClientAppSecret;
  };
};

export type CredsFile = {
  token_type: 'Bearer';
  expires_at: Integer;
  expires_in: Integer;
  refresh_token: Strava.RefreshToken;
  access_token: Strava.AccessToken;
  athlete: Strava.Schema.SummaryAthlete;
};
