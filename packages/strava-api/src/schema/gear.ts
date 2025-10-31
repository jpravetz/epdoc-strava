import type { ResourceStateType } from './types.ts';

export interface DetailedGear {
  id: string;
  resource_state: ResourceStateType;
  primary: boolean;
  name: string;
  distance: number;
  brand_name: string;
  model_name: string;
  frame_type: number;
  description: string;
}

export interface SummaryGear {
  id: string;
  resource_state: ResourceStateType;
  primary: boolean;
  name: string;
  distance: number;
}
