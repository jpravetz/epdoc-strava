export interface PhotoSummary_primary {
  id: number;
  source: number;
  unique_id: string;
  urls: string;
}

export interface PhotoSummary {
  count: number;
  primary: PhotoSummary_primary;
}
