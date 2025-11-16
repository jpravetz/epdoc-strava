import type * as CliApp from '@epdoc/cliapp';
import type * as FS from '@epdoc/fs/fs';
import type { Dict, Integer } from '@epdoc/type';
import type { Api } from '../dep.ts';
import type { KmlLineStyle as LineStyle } from '../track/types.ts';

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

/**
 * Bike definition for mapping Strava bike names to custom display names.
 *
 * Used in user settings to specify shorter or clearer names for bikes
 * in PDF/XML output.
 */
export type BikeDef = {
  /** Display name to use in output */
  name: string;
  /** Pattern to match against Strava bike name (case-insensitive) */
  pattern: string;
};

export type UserSettings = {
  /** A description of this file, not used by code */
  description: string;
  // client: StravaClientConfig;
  athleteId?: Integer;
  /**  */
  cachePath?: string;
  /** Custom line styles for KML files */
  lineStyles?: Record<string, LineStyle>;
  bikes?: BikeDef[];
  /** Default folder to save gpx files. Can be overridden by --output flag. */
  gpxFolder?: FS.FolderPath;
  /**
   * Blackout regions where we optionally do not show paths in our gpx or kml output
   */
  blackoutZones?: Api.LatLngRect[];
  /**
   * A user will manually add entries to this file when they do not like the name that
   * Strava uses for a segment.
   */
  aliases?: Record<Api.Schema.SegmentName, string>;
};

/**
 * Config data that is part of the source code for this project
 */
export type ConfigFile = {
  description: string;
  paths: {
    /** The path to a file containing our list of starred segments */
    userSegments: FS.FilePath;
    /** The path to the user's settings file, which includes name aliases for their starred
     * segments, in situations where they do not like the names used on Strava. The aliases uses the
     * segment name rather than id so that the user can hand edit this file and know what each entry
     * is for.  */
    userSettings: FS.FilePath;
    /** the user's personal credentials and tokens that allow for authenticating to Strava as an athlete */
    userCreds: FS.FilePath;
    /** The credentials for this application, registered with Strava */
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
