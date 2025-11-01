import type { DateRanges } from '@epdoc/daterange';
import type { Dict } from '@epdoc/type';
import type { Api } from '../dep.ts';

export type LineStyle = {
  color: string;
  width: number;
};

export type LineStyleDefs = Record<Api.ActivityType | 'Default', LineStyle>;

export type Opts = {
  more?: boolean; // include additional description for each activity
  dates?: DateRanges[]; // date range for which to output data
  imperial?: boolean; // use legacy imperial units
  activities?: boolean; // output activities
  segments?: boolean; // output segments
  segmentsFlatFolder?: boolean;
  verbose?: number; // log level (0 for none)
  bikes?: Dict;
};

export type PlacemarkParams = {
  description?: string;
  coordinates?: unknown[];
  placemarkId?: string;
  name?: string;
  styleName?: string;
};
