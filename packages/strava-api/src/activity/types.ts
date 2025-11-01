import type * as Schema from '../schema/mod.ts'; // Import Schema for segment types

export type Filter = {
  commuteOnly?: boolean;
  nonCommuteOnly?: boolean;
  include?: string[];
  exclude?: string[];
};

export type SegmentData = Schema.DetailedSegmentEffort; // Changed to DetailedSegmentEffort
export type SegmentEffort = Schema.DetailedSegmentEffort;
