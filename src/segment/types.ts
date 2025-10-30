import type { Metres } from '../types.ts';

export type Id = string;
export type Name = string;
export type GpsDegrees = number;

export type CacheEntry = {
  name?: Name;
  distance?: Metres;
  gradient?: number;
  elevation?: Metres;
};
