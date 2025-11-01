import type { ISODate } from '@epdoc/datetime';
import type * as Consts from './consts.ts';
import type { SummaryGear } from './gear.ts';
import type { PhotoSummary } from './photo.ts';
import type { DetailedSegmentEffort } from './segment.ts';
import type { ActivityType, MetaActivity, MetaAthlete } from './types.ts';

export type ActivityZoneType = typeof Consts.ActivityZoneDefs[keyof typeof Consts.ActivityZoneDefs];

export interface TimedZoneRange {
  min: number;
  max: number;
  time: number;
}

export interface PolylineMap {
  id: string;
  polyline: string;
  summary_polyline: string;
}

export interface Split {
  average_speed: number;
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
  pace_zone: number;
  moving_time: number;
  split: number;
}

export interface ActivityZone {
  score: number;
  distribution_buckets: TimedZoneRange[];
  type: ActivityZoneType;
  sensor_based: boolean;
  points: number;
  custom_zones: boolean;
  max: number;
}

export interface ActivityTotal {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count: number;
}

export interface ActivityStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_ride_totals: ActivityTotal;
  recent_run_totals: ActivityTotal;
  recent_swim_totals: ActivityTotal;
  ytd_ride_totals: ActivityTotal;
  ytd_run_totals: ActivityTotal;
  ytd_swim_totals: ActivityTotal;
  all_ride_totals: ActivityTotal;
  all_run_totals: ActivityTotal;
  all_swim_totals: ActivityTotal;
}

export interface SummaryActivity {
  id: number;
  external_id: string;
  upload_id: number;
  athlete: MetaAthlete;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  elev_high: number;
  elev_low: number;
  type: ActivityType;
  start_date: ISODate;
  start_date_local: ISODate;
  timezone: string;
  start_latlng: number[];
  end_latlng: number[];
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  total_photo_count: number;
  map: PolylineMap;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  flagged: boolean;
  workout_type: number;
  average_speed: number;
  max_speed: number;
  has_kudoed: boolean;
  gear_id: string;
  average_temp: number;
  device_name: string;
}

export interface DetailedActivity extends SummaryActivity {
  description: string;
  photos: PhotoSummary;
  gear: SummaryGear;
  calories: number;
  segment_efforts: DetailedSegmentEffort[];
  embed_token: string;
  splits_metric: Split[];
  splits_standard: Split[];
  laps: Lap[];
  best_efforts: DetailedSegmentEffort[];
  device_watts?: boolean;
  has_heartrate?: boolean;
  heartrate_mode?: string;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  average_watts?: number;
  max_heartrate?: number;
  average_heartrate?: number;
  suffer_score?: number;
  segment_leaderboard_opt_out?: boolean;
  private_note?: string;
  sport_type?: string;
}

export interface Lap {
  id: number;
  activity: MetaActivity;
  athlete: MetaAthlete;
  average_cadence: number;
  average_speed: number;
  distance: number;
  elapsed_time: number;
  start_index: number;
  end_index: number;
  lap_index: number;
  max_speed: number;
  moving_time: number;
  name: string;
  pace_zone: number;
  split: number;
  start_date: ISODate;
  start_date_local: ISODate;
  total_elevation_gain: number;
}
