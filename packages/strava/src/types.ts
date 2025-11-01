import { Api } from './dep.ts';
import * as Kml from './kml/mod.ts';

export type StravaConfig = {
  description: string;
  client: Api.ClientConfig;
  athleteId?: number;
  // accessToken: string;
  cachePath?: string;
  lineStyles?: Record<string, Kml.LineStyle>;
  bikes?: BikeDef[];
  aliases?: Record<Api.SegmentName, Api.SegmentName>;
};
