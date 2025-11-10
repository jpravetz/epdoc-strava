import type { StravaLongInt } from './types.ts';

export interface PhotoSummary_primary {
  id: StravaLongInt;
  source: number;
  unique_id: string;
  urls: Record<string, string>;
}

export interface PhotoSummary {
  count: number;
  primary: PhotoSummary_primary;
}
