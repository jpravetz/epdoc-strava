import type { Metres, Schema, Seconds } from './dep.ts';
import type { SegmentSummary } from './summary.ts';
import type * as Segment from './types.ts';

/**
 * Base class for Strava segment data with core timing and distance metrics.
 *
 * This class wraps Strava's SummarySegment schema and provides a consistent
 * interface for segment information. It serves as the foundation for more
 * specialized segment classes like SegmentData (which adds coordinates and
 * location info).
 *
 * @example
 * ```ts
 * const segment = new SegmentBase(summaryData);
 * console.log(segment.name, segment.distance);
 * ```
 */
export class SegmentBase implements Segment.IData {
  data: Schema.SummarySegment = {} as Schema.SummarySegment;
  id: Schema.SegmentId = '0';
  name: Schema.SegmentName = '';
  elapsed_time: Seconds = 0;
  moving_time: Seconds = 0;
  distance: Metres = 0;

  constructor(data: SegmentSummary) {
    Object.assign(this, data);
  }
}
