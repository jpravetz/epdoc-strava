import { dateRanges } from '@epdoc/daterange';
import { FileSpec } from '@epdoc/fs';
import { _ } from '@epdoc/type';
import * as colors from '@std/fmt/colors';
import type * as Options from './types.ts';

export const mapDef: Record<string, Options.Def> = {
  date: {
    short: 'd',
    name: 'date',
    params: '<dates>',
    description: [
      'Comma separated list of date ranges in the format ',
      colors.blue('20141231-20150105,20150107-'),
      ', used to constrain ${cmd} operation. ',
    ].join(''),
    argParser: (str: string) => {
      return dateRanges(str);
    },
  },
  more: { name: 'more', description: 'Include additional detail info in KML.' },
  dryRun: { short: 'n', name: 'dry-run', description: 'Do not modify any data (database, files or server).' },
  output: {
    short: 'o',
    name: 'output',
    params: '<filename>',
    description: 'Output filename.',
    argParser: (str: string) => {
      return _.isString(str) ? new FileSpec(Deno.cwd(), str) : str;
    },
  },
  activities: {
    short: 'a',
    name: 'activities',
    params: '[filter]',
    description: 'Output activities to kml file, optionally filtering by activity type)',
  },
  segments: {
    short: 's',
    name: 'segments',
    description:
      'Output starred segments to KML, adding efforts within date range to description if --more. Segments are grouped into folders by location unless opts is set to flat',
  },
  refresh: {
    short: 'r',
    name: 'refresh',
    description: 'Refresh list of starred segments.',
  },
} as const;
