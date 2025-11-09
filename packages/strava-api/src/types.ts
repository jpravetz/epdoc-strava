import type { EpochSeconds } from '@epdoc/duration';
import type * as FS from '@epdoc/fs/fs';
import type { Dict, Integer } from '@epdoc/type';
import type * as Schema from './schema/mod.ts';

/** An authorization code obtained from the Strava OAuth2 flow. */
export type Code = string;
/** An access token for making API requests. */
export type AccessToken = string;
/** A refresh token for obtaining a new access token. */
export type RefreshToken = string;

/** A distance in kilometers. */
export type Kilometres = number;
/** A distance in meters. */
export type Metres = number;

/** A dictionary of query parameters. */
export type Query = Dict;
/** A geographical coordinate, represented as a [latitude, longitude] pair. */
export type Coord = [number, number];
/** Data for a set of coordinates. */
export type CoordData = {
  type: string;
  data: Coord[];
};

/** The client ID for a Strava application. */
export type ClientId = Integer;
/** The client secret for a Strava application. */
export type ClientSecret = string;

/** Strava application client credentials. */
export type ClientCreds = {
  id: ClientId;
  secret: ClientSecret;
};

/** Configuration for a Strava client application. */
export type ClientConfig = {
  description: string;
  client: ClientCreds;
};

/**
 * A source for Strava client credentials.
 *
 * This can be one of the following:
 * - An object containing the credentials directly.
 * - A file path to a JSON file containing the credentials.
 * - A boolean indicating that the credentials should be loaded from environment variables.
 */
export type ClientCredSrc =
  | { creds: ClientCreds }
  | { path: FS.FilePath }
  | { env: true | { id: string; secret: string } };

/** Options for making an authenticated API request. */
export type Opts = ClientCreds & {
  token: AccessToken;
};

/** Options for generating a Strava authorization URL. */
export type AuthUrlOpts = {
  redirectUri?: string;
  scope?: string;
  state?: string;
  approvalPrompt?: string;
};

/** Options for retrieving activities. */
export type ActivityOpts = {
  athleteId: Schema.AthleteId;
  query: {
    after: EpochSeconds;
    before: EpochSeconds;
    per_page: number;
    page?: number;
  };
};

/**
 * Data for Strava API credentials.
 *
 * This is the data that is stored in the credentials file.
 */
export type StravaCredsData = {
  token_type?: string;
  expires_at: EpochSeconds;
  expires_in: EpochSeconds;
  refresh_token?: string;
  access_token?: string;
  athlete: {
    id?: Schema.AthleteId;
    username?: string;
    [key: string]: unknown;
  };
};
