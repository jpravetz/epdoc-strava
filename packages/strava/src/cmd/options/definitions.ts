import { dateRanges } from '@epdoc/daterange';
import { FileSpec } from '@epdoc/fs';
import { _ } from '@epdoc/type';
import * as colors from '@std/fmt/colors';
import { Api } from '../../dep.ts';
import type * as Options from './types.ts';

export const mapDef: Record<string, Options.Def> = {
  date: {
    short: 'd',
    name: 'date',
    params: '<dates>',
    description: `Comma-separated date ranges (REQUIRED). Format: ${
      colors.blue('20141231-20150105,20150107-')
    }`,
    argParser: (str: string) => {
      return dateRanges(str);
    },
  },
  output: {
    short: 'o',
    name: 'output',
    params: '<filename>',
    description: 'Output KML filename (REQUIRED).',
    argParser: (str: string) => {
      return _.isString(str) ? new FileSpec(Deno.cwd(), str) : str;
    },
  },
  activities: {
    short: 'a',
    name: 'activities',
    params: '[types]',
    description:
      'Include activities (default when no flags specified). Optional: comma-separated activity types',
    choices: Object.keys(Api.Schema.ActivityName),
    argParser: (str: string | boolean) => {
      if (str === true || str === '') return true; // All activities
      if (_.isString(str)) {
        return str.split(',').map((s) => s.trim());
      }
      return str;
    },
  },
  segments: {
    short: 's',
    name: 'segments',
    params: '[mode]',
    description: 'Include starred segments. Modes: "only", "flat"',
    choices: ['only', 'flat'],
    argParser: (str: string | boolean) => {
      if (str === true || str === '') return true;
      return str;
    },
  },
  more: {
    short: 'm',
    name: 'more',
    description: 'Include detailed descriptions',
  },
  laps: {
    short: 'l',
    name: 'laps',
    description: 'Include lap markers in KML output',
  },
  commute: {
    name: 'commute',
    params: '<choice>',
    description: 'Filter by commute: yes|no|all (default: all)',
    choices: ['yes', 'no', 'all'],
    defVal: 'all',
  },
  dryRun: {
    short: 'n',
    name: 'dry-run',
    description: 'Do not modify any data (database, files or server).',
  },
  refresh: {
    short: 'r',
    name: 'refresh',
    description: 'Refresh list of starred segments.',
  },
} as const;
