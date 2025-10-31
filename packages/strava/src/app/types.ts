import { DateRanges } from '@epdoc/daterange';
import type { Dict } from '@epdoc/type';
import type { LineStyle } from './kml.ts';

export type SegmentConfig = {
  description: string;
  alias: Dict;
  data: Dict;
};

export type Opts = {
  home: string;
  cwd: string;
  // config?: StravaConfig;
  auth?: boolean;
  segmentsFile?: string;
  refreshStarredSegments?: boolean;
  credentialsFile?: string;
  athlete?: string;
  athleteId?: number;
  selectedBikes?: string[];
  friends?: string[];
  dates?: DateRanges[];
  dateRanges?: DateRanges[];
  more?: boolean;
  kml?: string;
  xml?: string;
  activities?: string[];
  activityFilter?: string[];
  commuteOnly?: boolean;
  nonCommuteOnly?: boolean;
  imperial?: boolean;
  segments?: boolean | string;
  verbose?: number;
};

export type StravaConfig = {
  description: string;
  client: StravaClientConfig;
  athleteId?: number;
  // accessToken: string;
  cachePath?: string;
  lineStyles?: Record<string, LineStyle>;
  bikes?: BikeDef[];
  aliases?: Record<SegmentName, SegmentName>;
};
