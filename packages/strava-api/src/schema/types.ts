import type { Integer } from '@epdoc/type';
import type { ActivityId } from './activity.ts';
import type { AthleteId } from './athlete.ts';
import type * as Consts from './consts.ts';

/**
 * A unique identifier for a Strava object.
 *
 * Strava uses int64 (Long) values for IDs in their API specification, but in practice
 * these values are small enough to safely fit within JavaScript's Number.MAX_SAFE_INTEGER.
 */
export type StravaLongInt = Integer;

export type ActivityType = typeof Consts.ActivityName[keyof typeof Consts.ActivityName];
export type FollowerStatusType = typeof Consts.FollowerStatus[keyof typeof Consts.FollowerStatus];
export type ResourceStateType = typeof Consts.ResourceState[keyof typeof Consts.ResourceState];
export type SexType = typeof Consts.Sex[keyof typeof Consts.Sex];
export type SportType = typeof Consts.SportName[keyof typeof Consts.SportName];
export type StreamKeyType = typeof Consts.StreamKeys[keyof typeof Consts.StreamKeys];
export type UnitSystemType = typeof Consts.UnitSystem[keyof typeof Consts.UnitSystem];

export interface MetaAthlete {
  id: AthleteId;
  resource_state: ResourceStateType;
}

export interface MetaActivity {
  id: ActivityId;
  resource_state: ResourceStateType;
}
