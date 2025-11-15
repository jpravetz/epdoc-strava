import type { DateRanges } from '@epdoc/daterange';
import type { Dict } from '@epdoc/type';
import type { Api } from '../dep.ts';

export type KmlLineStyle = {
  color: string;
  width: number;
};

// LineStyleDefs supports ActivityTypes plus custom style names (Commute, Moto, Segment, Default, etc.)
export type KmlLineStyleDefs = Record<string, KmlLineStyle>;

export type ActivityOpts = {
  activities?: boolean;
  efforts?: boolean; // include starred segment efforts in activity descriptions
  laps?: boolean; // include lap markers in KML output
  commute?: 'yes' | 'no' | 'all'; // filter by commute status
  type?: Api.Schema.ActivityType[]; // filter by activity type (empty=all, string[]=filtered by types)
};

export type SegmentOpts = {
  segments?: boolean | 'only' | 'flat'; // true/only = include segments, flat = flat folder structure
  refresh?: boolean; // refresh list of starred segments from Strava
  bikes?: Dict; // bike definitions for identifying moto vs bike
};

export type CommonOpts = {
  output?: string; // output filename with extension or folder path if outputting gpx files
  date?: DateRanges; // date range for which to output data
  more?: boolean; // include basic activity stats in description (distance, elevation, times, custom props)
  imperial?: boolean; // use imperial units (miles, feet) instead of metric
};

export type Opts = CommonOpts & ActivityOpts & SegmentOpts;

export type Coord = [number, number]; // [lat, lng]

export type KmlPlacemarkParams = {
  description?: string;
  coordinates?: Coord[];
  placemarkId?: string;
  name?: string;
  styleName?: string;
};
