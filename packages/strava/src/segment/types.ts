import type { ISOTzDate } from '@epdoc/datetime';
import type { Strava } from './dep.ts';

export type Id = string;
export type Name = string;
export type GpsDegrees = number;

export type CacheEntry = {
  name?: Name;
  distance?: Strava.Metres;
  gradient?: number;
  elevation?: Strava.Metres;
};

export type CacheFile = {
  description?: string;
  lastModified?: ISOTzDate;
  segments: Record<Name, CacheEntry>;
};
