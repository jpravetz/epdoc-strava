import { _ } from '@epdoc/type';
import type * as Schema from './schema/mod.ts';

/**
 * Type guard to check if a value is a valid StravaId.
 *
 * StravaIds are strings containing only numeric digits (0-9).
 * This avoids JavaScript's integer precision issues with int64 values.
 */
export function isStravaId(value: unknown): value is Schema.StravaId {
  return _.isInteger(value);
}

export function isSegmentId(value: unknown): value is Schema.SegmentId {
  return _.isInteger(value);
}

/**
 * Type guard to check if a value is a valid Stream object.
 *
 * A Stream has a type property and a data array.
 */
export function isStream(value: unknown): value is Schema.Stream | Schema.LatLngStream {
  return _.isDict(value) &&
    'type' in value &&
    _.isString(value.type) &&
    'data' in value &&
    _.isArray(value.data);
}

/**
 * Type guard to check if a value is an array of Stream objects.
 *
 * This is the format returned when key_by_type parameter is empty/false.
 */
export function isStreamArray(value: unknown): value is (Schema.Stream | Schema.LatLngStream)[] {
  return _.isArray(value) && value.every(isStream);
}

/**
 * Type guard to check if a value is a StreamSet object.
 *
 * This is the format returned when key_by_type=true.
 */
export function isStreamSet(value: unknown): value is Partial<Schema.StreamSet> {
  return _.isDict(value) &&
    Object.values(value).every((stream) => isStream(stream));
}

/**
 * Type guard to check if a StreamSet has valid latlng data.
 *
 * Checks if the StreamSet has a latlng property with a data array.
 */
export function hasLatLngData(
  value: Partial<Schema.StreamSet>,
): value is Schema.StreamSet & { latlng: Schema.LatLngStream } {
  return _.isDict(value.latlng) && _.isArray(value.latlng.data);
}

/**
 * Type guard to check if a value is a SummarySegment.
 *
 * IDs are validated as StravaId (numeric strings) per Strava API Long type specification.
 */
export function isSummarySegment(value: unknown): value is Schema.SummarySegment {
  return _.isDict(value) &&
    isStravaId(value.id) &&
    _.isString(value.name) &&
    _.isNumber(value.distance);
}

/**
 * Type guard to check if a value is an array of SummarySegment objects.
 */
export function isSummarySegmentArray(value: unknown): value is Schema.SummarySegment[] {
  return _.isArray(value) && value.every((item) => isSummarySegment(item));
}

/**
 * Type guard to check if a value is an array of DetailedSegmentEffort objects.
 */
export function isSegmentEffortArray(value: unknown): value is Schema.DetailedSegmentEffort[] {
  return _.isArray(value);
}

/**
 * Type guard to check if a value is a DetailedAthlete.
 *
 * IDs are validated as StravaId (numeric strings) per Strava API Long type specification.
 */
export function isDetailedAthlete(value: unknown): value is Schema.DetailedAthlete {
  return _.isDict(value) &&
    isStravaId(value.id) &&
    _.isString(value.firstname) &&
    _.isString(value.lastname);
}

/**
 * Type guard to check if a value is a SummaryActivity.
 *
 * IDs are validated as StravaId (numeric strings) per Strava API Long type specification.
 */
export function isSummaryActivity(value: unknown): value is Schema.SummaryActivity {
  return _.isDict(value) &&
    isStravaId(value.id) &&
    _.isString(value.name);
}

/**
 * Type guard to check if a value is an array of SummaryActivity objects.
 */
export function isSummaryActivityArray(value: unknown): value is Schema.SummaryActivity[] {
  return _.isArray(value) && value.every((item) => isSummaryActivity(item));
}

/**
 * Type guard to check if a value is a DetailedActivity.
 *
 * IDs are validated as StravaId (numeric strings) per Strava API Long type specification.
 */
export function isDetailedActivity(value: unknown): value is Schema.DetailedActivity {
  return _.isDict(value) &&
    isStravaId(value.id) &&
    _.isString(value.name) &&
    _.isNumber(value.distance);
}
