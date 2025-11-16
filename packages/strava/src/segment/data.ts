import type { Api } from '../dep.ts';
import { SegmentBase } from './base.ts';
import type { Metres, Seconds } from './dep.ts';
import type * as Segment from './types.ts';

/**
 * Extended segment data class with coordinates and location information for KML output.
 *
 * This class extends SegmentBase with additional fields needed for generating KML files:
 * - Coordinates array for drawing segment routes in Google Earth
 * - Country and state for hierarchical folder organization
 *
 * Used primarily by the KML generator to organize segments by region and output
 * segment routes as LineString placemarks.
 *
 * @example
 * ```ts
 * const segmentData = new SegmentData(segmentBase);
 * segmentData.coordinates = [{ lat: 37.7, lng: -122.4 }];
 * segmentData.country = "USA";
 * segmentData.state = "California";
 * ```
 */
export class SegmentData implements Segment.IData {
  id: Api.Schema.SegmentId = 0;
  name: Api.Schema.SegmentName = '';
  elapsedTime: Seconds = 0;
  movingTime: Seconds = 0;
  distance: Metres = 0;
  coordinates: Partial<Api.TrackPoint>[] = [];
  country: string = '';
  state: string = '';
  efforts?: Api.Schema.DetailedSegmentEffort[] = [];

  constructor(data: SegmentBase) {
    if (data instanceof SegmentBase) {
      this.id = data.id;
      this.name = data.name;
      this.elapsedTime = data.elapsed_time;
      this.movingTime = data.moving_time;
      this.distance = data.distance;
    }
  }
}
