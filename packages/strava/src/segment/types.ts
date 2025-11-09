import type { ISOTzDate } from '@epdoc/datetime';
import type { Metres } from './dep.ts';

export type Id = number;
export type Name = string;
export type GpsDegrees = number;

export type CacheEntry = {
  name?: Name;
  distance?: Metres;
  gradient?: number;
  elevation?: Metres;
};

export type CacheFile = {
  description?: string;
  lastModified?: ISOTzDate;
  segments: Record<Name, CacheEntry>;
};
