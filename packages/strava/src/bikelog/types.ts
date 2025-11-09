import type { DateRanges } from '@epdoc/daterange';
import type { FileSpec } from '@epdoc/fs';
import type { Dict } from '@epdoc/type';
import type { BikeDef } from '../app/types.ts';

export type OutputOpts = {
  more?: boolean;
  dates?: DateRanges;
  imperial?: boolean;
  segmentsFlatFolder?: boolean;
  selectedBikes?: BikeDef[];
  verbose?: number;
  bikes?: Dict;
};

export type Opts = {
  output?: string | FileSpec; // output filename
  date?: DateRanges; // date range for which to output data
  selectedBikes?: BikeDef[]; // bike filter definitions
  bikes?: Dict; // bike definitions for identifying bikes
};
