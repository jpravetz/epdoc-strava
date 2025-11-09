import type { ISODate } from '@epdoc/datetime';
import type { ActivityId, PolylineMap } from './activity.ts'; // Added import for PolylineMap
import type { AthleteId } from './athlete.ts';
import type { ActivityType, StravaId } from './types.ts';

export type SegmentName = string;
/** A unique identifier for a segment. */
export type SegmentId = StravaId;
/** A unique identifier for a segment effort. */
export type EffortId = StravaId;

export interface SummarySegment {
  id: SegmentId;
  name: SegmentName;
  activity_type: ActivityType;
  distance: number;
  average_grade: number;
  maximum_grade: number;
  elevation_high: number;
  elevation_low: number;
  start_latlng: number[];
  end_latlng: number[];
  climb_category: number;
  city: string;
  state: string;
  country: string;
  private: boolean;
  athlete_pr_effort?: SummarySegmentEffort; // Made optional as it might not always be present
  created_at?: ISODate;
  updated_at?: ISODate;
  total_elevation_gain?: number;
  map?: PolylineMap;
  effort_count?: number;
  athlete_count?: number;
  hazardous?: boolean;
  star_count?: number;
}

export interface SummarySegmentEffort {
  id: EffortId;
  activity_id?: ActivityId;
  athlete_id?: AthleteId;
  segment_id?: SegmentId;
  name?: string;
  elapsed_time: number;
  moving_time?: number;
  start_date: ISODate;
  start_date_local: ISODate;
  distance: number;
  start_index?: number;
  end_index?: number;
  average_cadence?: number;
  average_watts?: number;
  device_watts?: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  segment?: SummarySegment;
  kom_rank?: number;
  pr_rank?: number; // Moved from DetailedSegmentEffort to SummarySegmentEffort
  hidden?: boolean;
  is_kom: boolean;
  has_heartrate?: boolean;
}

export interface DetailedSegmentEffort extends SummarySegmentEffort {
  achievements?: Achievement[]; // Added achievements
}

export interface Achievement { // Define a minimal Achievement interface for now
  type?: string;
  rank?: number;
}
