import type * as CliApp from '@epdoc/cliapp';
import type * as FS from '@epdoc/fs/fs';
import type { Dict, Integer } from '@epdoc/type';
import type { Api } from '../dep.ts';
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

export type Opts = Partial<{
  strava: boolean;
  userSettings: boolean;
  config: boolean;
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
  aliases?: Record<Api.Schema.SegmentName, Api.Schema.SegmentName>;
};

export type ConfigFile = {
  description: string;
  paths: {
    userSegments: FS.FilePath;
    userSettings: FS.FilePath;
    userCreds: FS.FilePath;
    clientCreds: FS.FilePath;
  };
};

export type CredsFile = {
  token_type: 'Bearer';
  expires_at: Integer;
  expires_in: Integer;
  refresh_token: Api.RefreshToken;
  access_token: Api.AccessToken;
  athlete: Api.Schema.SummaryAthlete;
};
