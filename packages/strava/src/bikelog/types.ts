import type { DateRanges } from '@epdoc/daterange';
import type { Dict } from '@epdoc/type';

export type Def = {
  name: string;
  pattern: string;
};

export type OutputOpts = {
  more?: boolean;
  dates?: DateRanges[];
  imperial?: boolean;
  segmentsFlatFolder?: boolean;
  selectedBikes?: Def[];
  verbose?: number;
  bikes?: Dict;
};
