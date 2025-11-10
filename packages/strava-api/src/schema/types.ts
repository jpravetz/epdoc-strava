import type { Integer } from '@epdoc/type';
import type { ActivityId } from './activity.ts';
import type { AthleteId } from './athlete.ts';
import type * as Consts from './consts.ts';

/**
 * A unique identifier for a Strava object.
 *
 * Strava IDs are int64 (Long) values that exceed JavaScript's safe integer range.
 * To avoid precision loss during JSON serialization/deserialization, we store them as strings.
 */
export type StravaId = Integer;

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
