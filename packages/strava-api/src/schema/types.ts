import type * as Consts from './consts.ts';

export type ActivityType = typeof Consts.ActivityName[keyof typeof Consts.ActivityName];
export type FollowerStatusType = typeof Consts.FollowerStatus[keyof typeof Consts.FollowerStatus];
export type ResourceStateType = typeof Consts.ResourceState[keyof typeof Consts.ResourceState];
export type SexType = typeof Consts.Sex[keyof typeof Consts.Sex];
export type SportType = typeof Consts.SportName[keyof typeof Consts.SportName];
export type StreamKeyType = typeof Consts.StreamKeys[keyof typeof Consts.StreamKeys];
export type UnitSystemType = typeof Consts.UnitSystem[keyof typeof Consts.UnitSystem];

export interface MetaAthlete {
  id: number;
  resource_state: ResourceStateType;
}

export interface MetaActivity {
  id: number;
  resource_state: ResourceStateType;
}
