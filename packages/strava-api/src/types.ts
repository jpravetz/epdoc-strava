import type { EpochSeconds } from '@epdoc/duration';
import type { Dict } from '@epdoc/type';

export type Code = string;
export type Secret = string;
export type AccessToken = string;
export type RefreshToken = string;
export type ClientId = number;

export enum StreamSource {
  activities = 'activities',
  segments = 'segments',
  routes = 'routes',
  segmentEfforts = 'segment_efforts',
}
export enum StreamType {
  latlng = 'latlng',
  distance = 'distance',
  altitude = 'altitude',
}
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

export type AuthorizationUrlOpts = {
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

export interface MetaAthlete {
  id: number;
}

export interface DetailedActivity {
  id: ActivityId;
  athlete: MetaAthlete;
}
