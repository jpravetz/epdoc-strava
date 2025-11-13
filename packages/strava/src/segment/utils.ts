import { _ } from '@epdoc/type';
import { Api } from '../dep.ts';
import type * as Segment from './types.ts';

/**
 * Converts a Strava SummarySegment API response to a CacheEntry for local storage.
 *
 * Extracts key segment metadata from the API response. Coordinates are not included
 * as they must be fetched separately via getSegmentStreams API call.
 *
 * @param data SummarySegment from Strava API
 * @returns CacheEntry with segment metadata for caching
 */
export function asCacheEntry(data: Api.Schema.SummarySegment): Segment.CacheEntry | undefined {
  if (
    data && Api.isSegmentId(data.id) && _.isNonEmptyString(data.name) &&
    _.isNumber(data.elevation_high) &&
    _.isNumber(data.elevation_low) && _.isNumber(data.distance) && _.isNumber(data.average_grade)
  ) {
    return {
      id: data.id,
      name: data.name.trim(),
      distance: data.distance,
      gradient: data.average_grade,
      elevation: data.elevation_high - data.elevation_low,
      country: data.country,
      state: data.state,
    };
  }
}
