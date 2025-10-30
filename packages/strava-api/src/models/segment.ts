import type { ActivityType, MetaActivity, MetaAthlete } from './types.ts';

export interface SummarySegmentEffort {
  id: number;
  elapsed_time: number;
  start_date: Date;
  start_date_local: Date;
  distance: number;
  is_kom: boolean;
}

export interface SummarySegment {
  id: number;
  name: string;
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
  athlete_pr_effort: SummarySegmentEffort;
}

export interface DetailedSegmentEffort {
  id: number;
  elapsed_time: number;
  start_date: Date;
  start_date_local: Date;
  distance: number;
  is_kom: boolean;
  name: string;
  activity: MetaActivity;
  athlete: MetaAthlete;
  moving_time: number;
  start_index: number;
  end_index: number;
  average_cadence: number;
  average_watts: number;
  device_watts: boolean;
  average_heartrate: number;
  max_heartrate: number;
  segment: SummarySegment;
  kom_rank: number;
  pr_rank: number;
  hidden: boolean;
}
