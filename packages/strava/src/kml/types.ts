import type { DateRanges } from '@epdoc/daterange';
import type { FileSpec } from '@epdoc/fs';
import type { Dict } from '@epdoc/type';

export type LineStyle = {
  color: string;
  width: number;
};

// LineStyleDefs supports ActivityTypes plus custom style names (Commute, Moto, Segment, Default, etc.)
export type LineStyleDefs = Record<string, LineStyle>;

export type Opts = {
  output?: string | FileSpec; // output filename
  date?: DateRanges; // date range for which to output data
  more?: boolean; // include additional description for each activity
  commute?: 'yes' | 'no' | 'all'; // filter by commute status
  dryRun?: boolean; // do not modify any data
  activities?: boolean | string[]; // output activities (true=all, string[]=filtered by types)
  segments?: boolean | 'only' | 'flat'; // output segments (true=included, 'only'=segments only no activities, 'flat'=flat folder structure)
  imperial?: boolean; // use imperial units (miles, feet) instead of metric
  refresh?: boolean; // refresh list of starred segments
  bikes?: Dict; // bike definitions for identifying moto vs bike
};

export type Coord = [number, number]; // [lat, lng]

export type PlacemarkParams = {
  description?: string;
  coordinates?: Coord[];
  placemarkId?: string;
  name?: string;
  styleName?: string;
};
