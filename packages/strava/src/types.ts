import { Strava } from './dep.ts';
import * as Kml from './kml/mod.ts';

export type StravaConfig = {
  description: string;
  client: Strava.ClientConfig;
  athleteId?: number;
  // accessToken: string;
  cachePath?: string;
  lineStyles?: Record<string, Kml.LineStyle>;
  bikes?: BikeDef[];
  aliases?: Record<Strava.SegmentName, Strava.SegmentName>;
};
