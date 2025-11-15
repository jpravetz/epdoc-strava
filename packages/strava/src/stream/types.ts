import type { DateRanges } from '@epdoc/daterange';
import type * as FS from '@epdoc/fs/fs';
import type { Dict } from '@epdoc/type';
import type { Api } from '../dep.ts';

export type KmlLineStyle = {
  color: string;
  width: number;
};

export type ActivityExType = Api.Schema.ActivityType | 'Segment' | 'Commute' | 'Moto' | 'Default';

// LineStyleDefs supports ActivityTypes plus custom style names (Commute, Moto, Segment, Default, etc.)
export type KmlLineStyleDefs = Partial<Record<ActivityExType, KmlLineStyle>>;

/**
 * Options used when including Activity information
 */
export type ActivityOpts = {
  activities?: boolean;
  efforts?: boolean; // include starred segment efforts in activity descriptions
  commute?: 'yes' | 'no' | 'all'; // filter by commute status
  type?: Api.Schema.ActivityType[]; // filter by activity type (empty=all, string[]=filtered by types)
};

/**
 * Options used only when generating segments in streams
 */
export type StreamSegmentOpts = {
  segments?: boolean | 'only' | 'flat'; // true/only = include segments, flat = flat folder structure
  refresh?: boolean; // refresh list of starred segments from Strava
  bikes?: Dict; // bike definitions for identifying moto vs bike
};

export type CommonOpts = {
  output?: FS.Path; // output filename with extension or folder path if outputting gpx files
  date?: DateRanges; // date range for which to output data
  more?: boolean; // include basic activity stats in description (distance, elevation, times, custom props)
  imperial?: boolean; // use imperial units (miles, feet) instead of metric
};

/**
 * Options used only when generating streams
 */
export type StreamOpts = {
  activities?: boolean;
  laps?: boolean; // include lap markers in stream output
  blackout?: boolean;
  /** allow duplicate intermediate coordinates instead of filtering them out */
  allowDups?: boolean;
};

export type Opts = CommonOpts & ActivityOpts & StreamSegmentOpts & StreamOpts;

export type Coord = [number, number]; // [lat, lng] - deprecated, use CoordData instead

export type KmlPlacemarkParams = {
  description?: string;
  coordinates?: Partial<Api.CoordData>[];
  placemarkId?: string;
  name?: string;
  styleName?: string;
};
