import type { ISOTzDate } from '@epdoc/datetime';
import type { Seconds } from '@epdoc/duration';
import type { Api } from '../dep.ts';
import type { Metres } from './dep.ts';

export type GpsDegrees = number;

/**
 * Cached segment data stored in ~/.strava/user.segments.json
 *
 * This represents the metadata for a starred segment that we cache locally
 * to avoid repeated API calls. Coordinates are optional and only cached
 * if they've been fetched for KML generation.
 */
export type CacheEntry = {
  id: Api.Schema.SegmentId;
  name: Api.Schema.SegmentName;
  distance: Metres;
  gradient: number;
  elevation: Metres;
  country?: string;
  state?: string;
};

export interface IData {
  id: Api.Schema.SegmentId;
  name: Api.Schema.SegmentName;
  elapsedTime: Seconds;
  movingTime: Seconds;
  distance: Metres;
  coordinates: Partial<Api.TrackPoint>[];
  country: string;
  state: string;
}

export type Base = Partial<{
  id: Api.Schema.SegmentId;
  elapsedTime: Metres;
  movingTime: number;
  distance: Metres;
}>;

/**
 * Structure of the ~/.strava/user.segments.json cache file
 *
 * Segments are keyed by segment ID (as string) for fast lookup.
 * The cache stores segment metadata and optionally coordinates.
 */
export type CacheFile = {
  description?: string;
  lastModified?: ISOTzDate;
  segments: Record<Api.Schema.SegmentId, CacheEntry>; // Keyed by segment ID as string
};

export type CacheMap = Map<Api.Schema.SegmentId, CacheEntry>;
