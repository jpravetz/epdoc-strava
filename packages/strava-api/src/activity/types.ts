import type * as Schema from '../schema/mod.ts'; // Import Schema for segment types

/**
 * A filter for activities.
 *
 * This can be used to filter a list of activities based on various criteria.
 */
export type Filter = {
  /** Whether to include only commute activities. */
  commuteOnly?: boolean;
  /** Whether to include only non-commute activities. */
  nonCommuteOnly?: boolean;
  /** An array of activity types to include. */
  include?: string[];
  /** An array of activity types to exclude. */
  exclude?: string[];
};

/** Data for a segment effort, as returned by the Strava API. */
export type SegmentData = Schema.DetailedSegmentEffort; // Changed to DetailedSegmentEffort
/** A segment effort. */
export type SegmentEffort = Schema.DetailedSegmentEffort;
