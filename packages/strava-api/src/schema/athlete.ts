import type { ISODate } from '@epdoc/datetime';
import type { ActivityId } from './activity.ts';
import type { SummaryGear } from './gear.ts';
import type { ResourceStateType, SexType, SportType, StravaId, UnitSystemType } from './types.ts';

export interface SummaryClub {
  id: StravaId;
  resource_state: ResourceStateType;
  name: string;
  profile_medium: string;
  cover_photo: string;
  cover_photo_small: string;
  sport_type: SportType;
  city: string;
  state: string;
  country: string;
  private: boolean;
  member_count: number;
  featured: boolean;
  verified: boolean;
  url: string;
}

export type AthleteId = StravaId;

export interface SummaryAthlete {
  id: AthleteId;
  resource_state: ResourceStateType;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  sex: SexType;
  summit: boolean;
  created_at: ISODate;
  updated_at: ISODate;
  weight?: number;
  badge_type_id?: number;
}

export interface DetailedAthlete extends SummaryAthlete {
  follower_count: number;
  friend_count: number;
  measurement_preference: UnitSystemType;
  ftp: number;
  clubs: SummaryClub[];
  bikes: SummaryGear[];
  shoes: SummaryGear[];
  email?: string;
  athlete_type?: number;
}

export interface Comment {
  id: StravaId;
  activity_id: ActivityId;
  text: string;
  athlete: SummaryAthlete;
  created_at: Date;
}
