#!/usr/bin/env node
/*************************************************************************
 * Copyright(c) 2012-2014 Jim Pravetz <jpravetz@epdoc.com>
 * May be freely distributed under the MIT license.
 **************************************************************************/

// Deno does not support process.env, require, or __dirname.
// This file is rewritten for Deno/TypeScript.

import { parse } from '@std/flags';
import { resolve } from '@std/path';

// Replace with actual implementations or Deno-compatible libraries as needed
// import _ from "https://deno.land/x/lodash@4.17.15/lodash.js";
// import dateutil from "https://deno.land/x/date_fns@v2.16.1/index.js";
// import Main from "./lib/main.ts";

// Placeholder types and functions for missing modules
const _ = {
  without: (arr: string[], ...values: string[]) => arr.filter((x) => !values.includes(x)),
  each: <T>(arr: T[], fn: (item: T) => void) => arr.forEach(fn),
};
const dateutil = {
  toSortableString: (ms: number) => new Date(ms).toISOString().replace(/T.*/, ''),
};
class Main {
  constructor(_opts: unknown) {}
  run(cb: (err?: { message: string }) => void) {
    cb();
  }
}

// Deno.env.get is used instead of process.env
const env = Deno.env.get('NODE_ENV') || 'development';
const home = Deno.env.get('HOME') || Deno.env.get('HOMEPATH') || Deno.env.get('USERPROFILE') || '';

const segmentsFile = resolve(home, '.strava', 'segments.json');
const configFile = resolve(home, '.strava', 'settings.json');

// Read config file
let config: unknown;
try {
  const configText = await Deno.readTextFile(configFile);
  config = JSON.parse(configText);
} catch {
  console.log(`Error: config file does not exist: ${configFile}`);
  Deno.exit(1);
}

// Read segments file if it exists
let segments: unknown = undefined;
try {
  const segmentsText = await Deno.readTextFile(segmentsFile);
  segments = JSON.parse(segmentsText);
} catch {
  // Segments file is optional
}

// Parse command-line arguments
const args = parse(Deno.args);

const version = '1.0.0'; // Set your version here or read from a file

function commaList(val: string): string[] {
  return val.split(',');
}

function dateStringToDate(s: string): number {
  const p = s.match(/^(\d{4})(\d\d)(\d\d)$/);
  if (p) {
    return new Date(Number(p[1]), Number(p[2]) - 1, Number(p[3])).getTime();
  } else {
    throw new Error('Invalid date');
  }
}

function dateList(val: string): { after: number; before: number }[] {
  const result: { after: number; before: number }[] = [];
  const ranges = val.split(',');
  for (let idx = 0; idx < ranges.length; ++idx) {
    const range = ranges[idx];
    const p = range.split('-');
    let t0: number;
    let t1: number;
    try {
      if (p && p.length > 1) {
        t0 = dateStringToDate(p[0]);
        t1 = dateStringToDate(p[1]) + DAY;
      } else if (idx === ranges.length - 1) {
        t0 = dateStringToDate(range);
        t1 = Date.now(); // now
      } else {
        t0 = dateStringToDate(range);
        t1 = t0 + DAY;
      }
    } catch (e) {
      console.log((e as Error).toString());
      Deno.exit(1);
    }
    result.push({ after: t0 / 1000, before: t1 / 1000 });
  }
  return result;
}

const DAY = 24 * 3600 * 1000;

const opts: unknown = {
  home: home,
  config: config,
  segmentsFile: segmentsFile,
  athleteId: args.id ? parseInt(args.id, 10) : config.athleteId,
  athlete: args.athlete,
  bikes: args.bikes,
  friends: args.friends,
  dates: args.dates ? dateList(args.dates) : [], // array of date ranges, in seconds (not milliseconds)
  more: args.more,
  kml: args.kml,
  fxml: args.fxml,
  activities: args.activities,
  activityFilter: _.without((args.filter || []) as string[], 'commute', 'nocommute'),
  commuteOnly: (args.filter || []).includes('commute'),
  nonCommuteOnly: (args.filter || []).includes('nocommute'),
  imperial: args.imperial,
  segments: args.segments, // Will be true or 'flat'
  verbose: args.verbose,
};

if (args.start) {
  let t1 = Date.now();
  let t0 = t1 - Number(args.start) * DAY;
  if (args.end) {
    t1 = t1 - Number(args.end) * DAY;
  }
  opts.dates.push({ after: t0 / 1000, before: t1 / 1000 });
}

opts.dateRanges = []; // used for kml file
if (opts.dates && opts.dates.length) {
  console.log('Date ranges: ');
  _.each(opts.dates, function (range: { after: number; before: number }) {
    const tAfter = dateutil.toSortableString(1000 * range.after).replace(/\//g, '-');
    const tBefore = dateutil.toSortableString(1000 * range.before).replace(/\//g, '-');
    console.log('  From ' + tAfter + ' to ' + tBefore);
    opts.dateRanges.push({ after: tAfter.slice(0, 10), before: tBefore.slice(0, 10) });
  });
}

const main = new Main(opts);
main.run((err?: { message: string }) => {
  if (err) {
    console.log('Error: ' + err.message);
  } else {
    console.log('Done');
  }
  // Deno.exit(0); // don't do this else files will not be saved
});
