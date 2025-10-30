import type { SummaryGear } from './gear.ts';
import type { FollowerStatusType, ResourceStateType, SexType, SportType, UnitSystemType } from './types.ts';

export interface SummaryClub {
  id: number;
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

export interface DetailedAthlete {
  id: number;
  resource_state: ResourceStateType;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  friend: FollowerStatusType;
  follower: FollowerStatusType;
  premium: boolean;
  created_at: Date;
  updated_at: Date;
  follower_count: number;
  friend_count: number;
  mutual_friend_count: number;
  measurement_preference: UnitSystemType;
  email: string;
  ftp: number;
  weight: number;
  clubs: SummaryClub;
  bikes: SummaryGear;
  shoes: SummaryGear;
}

export interface SummaryAthlete {
  id: number;
  resource_state: ResourceStateType;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  sex: SexType;
  friend: string;
  follower: string;
  premium: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Comment {
  id: number;
  activity_id: number;
  text: string;
  athlete: SummaryAthlete;
  created_at: Date;
}
