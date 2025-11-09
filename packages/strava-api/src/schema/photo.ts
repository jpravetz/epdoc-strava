import type { StravaId } from './types.ts';

export interface PhotoSummary_primary {
  id: StravaId;
  source: number;
  unique_id: string;
  urls: Record<string, string>;
}

export interface PhotoSummary {
  count: number;
  primary: PhotoSummary_primary;
}
