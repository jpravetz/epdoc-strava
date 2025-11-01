import type { EpochSeconds } from '@epdoc/duration';
import type { Dict } from '@epdoc/type';

export type Code = string;
export type Secret = string;
export type AccessToken = string;
export type RefreshToken = string;
export type ClientId = number;

export type Kilometres = number;
export type Metres = number;

export type ObjId = number;
export type EffortId = ObjId;
export type SegmentId = ObjId;
export type Query = Dict;
export type Coord = [number, number];
export type CoordData = {
  type: string;
  data: Coord[];
};

export type ClientConfig = {
  id: ClientId;
  secret: Secret;
};

export type ApiOpts = ClientConfig & {
  token: AccessToken;
};

export type AuthUrlOpts = {
  redirectUri?: string;
  scope?: string;
  state?: string;
  approvalPrompt?: string;
};

export type ActivityOpts = {
  athleteId: number;
  query: {
    after: EpochSeconds;
    before: EpochSeconds;
    per_page: number;
    page?: number;
  };
};

export type ActivityId = string;

export type StravaCredsData = {
  token_type?: string;
  expires_at: EpochSeconds;
  expires_in: EpochSeconds;
  refresh_token?: string;
  access_token?: string;
  athlete: {
    id?: string;
    username?: string;
    [key: string]: unknown;
  };
};
