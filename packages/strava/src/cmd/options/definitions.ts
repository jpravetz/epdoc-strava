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
    description: 'Output ${cmd} filename (REQUIRED).',
    argParser: (str: string) => {
      return _.isString(str) ? new FileSpec(Deno.cwd(), str) : str;
    },
  },
  type: {
    short: 't',
    name: 'type',
    params: '[types]',
    description:
      'Include activity types (default when no flags specified). Optional: comma-separated activity types',
    choices: Object.keys(Api.Schema.ActivityName),
    argParser: (str: string | boolean) => {
      if (str === true || str === '') return []; // All activities
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
      return [];
    },
  },
  more: {
    short: 'm',
    name: 'more',
    description: 'Include activity stats in descriptions (distance, elevation, times)',
  },
  laps: {
    short: 'l',
    name: 'laps',
    description: 'Include lap markers in KML output',
  },
  efforts: {
    short: 'e',
    name: 'efforts',
    description: 'Include activity stats + starred segment efforts in descriptions (superset of --more)',
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
  kml: {
    short: 'k',
    name: 'kml',
    params: '<filename>',
    description: 'Generate KML file for starred segments.',
    argParser: (str: string) => {
      return _.isString(str) ? new FileSpec(Deno.cwd(), str) : str;
    },
  },
} as const;
