import type { DateRanges } from '@epdoc/daterange';
import type { FileSpec } from '@epdoc/fs';
import type { Api } from '../dep.ts';

export type LineStyle = {
  color: string;
  width: number;
};

// LineStyleDefs supports ActivityTypes plus custom style names (Commute, Moto, Segment, Default, etc.)
export type LineStyleDefs = Record<string, LineStyle>;

export type ActivityOpts = {
  activities: true;
  efforts?: boolean; // include basic activity stats + starred segment efforts (superset of --more)
  laps?: boolean; // include lap markers in KML output (independent of description options)
  commute?: 'yes' | 'no' | 'all'; // filter by commute status
  type?: Api.Schema.ActivityType[]; // filter by activity type (empty=all, string[]=filtered by types)
};

export type SegmentOpts = {
  segments: true;
  flat: boolean; // flat folder structure, otherwise by region
  efforts?: boolean; // include basic activity stats + starred segment efforts (superset of --more)
  refresh?: boolean; // refresh list of starred segments
  bikes?: Dict; // bike definitions for identifying moto vs bike
};

export type CommonOpts = {
  output?: string | FileSpec; // output filename
  date?: DateRanges; // date range for which to output data
  more?: boolean; // include basic activity stats in description (distance, elevation, times, custom props)
  imperial?: boolean; // use imperial units (miles, feet) instead of metric
};

export type Opts = ActivityOpts & SegmentOpts & CommonOpts;

export type Coord = [number, number]; // [lat, lng]

export type PlacemarkParams = {
  description?: string;
  coordinates?: Coord[];
  placemarkId?: string;
  name?: string;
  styleName?: string;
};
