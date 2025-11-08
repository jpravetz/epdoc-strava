export type StreamType =
  | 'time'
  | 'distance'
  | 'latlng'
  | 'altitude'
  | 'velocity_smooth'
  | 'heartrate'
  | 'cadence'
  | 'watts'
  | 'temp'
  | 'moving'
  | 'grade_smooth';
export type StreamResolution = 'low' | 'medium' | 'high';
export type StreamSeriesType = 'distance' | 'time';

export interface Stream {
  type: StreamType;
  original_size: number;
  resolution: StreamResolution;
  series_type: StreamSeriesType;
  data: (number | [number, number])[];
}

export interface StreamSet {
  time: Stream;
  distance: Stream;
  latlng: Stream;
  altitude: Stream;
  velocity_smooth: Stream;
  heartrate: Stream;
  cadence: Stream;
  watts: Stream;
  temp: Stream;
  moving: Stream;
  grade_smooth: Stream;
}
