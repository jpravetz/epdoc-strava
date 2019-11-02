const env = process.env['NODE_ENV'] || 'development';

import path from 'path';
import fs from 'fs';
import { Command } from 'commander';
import pkg from '../package.json';
import projectConfig from './config/project.settings.json';
import { Main, MainOpts, DateRange, StravaConfig } from './main';
import { readJson, Dict, EpochMilliseconds } from './util';
import { runCLI } from 'jest-runtime';

let dateutil = require('dateutil');

const DAY = 24 * 3600 * 1000;

// let root = Path.resolve(__dirname, '..');
const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

//let Config = require('a5config').init(env, [__dirname + '/../config/project.settings.json'], {excludeGlobals: true});
//let config = Config.get();

function run(): Promise<void> {
  const segmentsFile = path.resolve(home, '.strava', 'segments.json');
  const credentialsFile = path.resolve(home, '.strava', 'credentials.json');
  const userSettingsFile = path.resolve(home, '.strava', 'user.settings.json');
  // if (!fs.existsSync(configFile)) {
  //   console.log('Error: config file does not exist: %s', configFile);
  //   process.exit(1);
  // }

  let segments: Dict;

  return Promise.resolve()
    .then(resp => {
      if (fs.existsSync(segmentsFile)) {
        return readJson(segmentsFile);
      }
      return Promise.resolve({});
    })
    .then(resp => {
      segments = resp;
      if (fs.existsSync(userSettingsFile)) {
        return readJson(userSettingsFile);
      }
      return Promise.resolve({});
    })
    .then(resp => {
      let userConfig = resp;
      let config = Object.assign({}, projectConfig, userConfig);

      let program: Dict = new Command('strava');
      program
        .version(pkg.version)
        .option(
          '-d, --dates <dates>',
          "Comma separated list of activity date or date ranges in format '20141231-20150105,20150107'. " +
            'If the last entry in the list is a single date then everything from that date until today will be included.',
          dateList
        )
        .option('-i, --id <athleteId>', 'Athlete ID. Defaults to your login')
        .option('-u, --athlete', 'Show athlete details including list of bikes')
        .option(
          '-g, --friends [opt]',
          'Show athlete friends list (Use --more a complete summary, otherwise id and name are displayed)'
        )
        .option('-k, --kml <file>', 'Create KML file for specified date range')
        .option(
          '-x, --xml <file>',
          'Create Acroforms XML file for specified date range, this is specific to a particular unpublished PDF form document'
        )
        .option(
          '-c, --cache',
          "Use cached list of starred segments. Use this option unless you've starred new segments recently."
        )
        .option(
          '-a, --activities [filter]',
          "Output activities to kml file, optionally filtering by activity type (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute')",
          commaList
        )
        //.option('-f, --filter <types>', "Filter based on comma-separated list of activity types (as defined by Strava, 'Ride', 'Hike', 'Walk', etc), plus 'commute' and 'nocommute'", commaList)
        //.option('-p, --prompt', "With --show, when adding segments, prompt user whether to include or exclude a segment.")
        .option(
          '-s, --segments [opts]',
          "Output starred segments to KML, adding efforts within date range to description if --more. Segments are grouped into folders by location unless opts is set to 'flat'."
        )
        .option('-m, --more', 'When generating KML file, include additional detail info in KML description field')
        .option('-y, --imperial', 'Use imperial units')
        .option('-p, --path <cwd>', 'Current folder')
        .option('-v, --verbose', 'Verbose messages')
        .parse(process.argv);

      let opts: MainOpts = {
        home: home,
        cwd: program.cwd,
        config: config,
        useCache: cache,
        segmentsFile: segmentsFile,
        credentialsFile: credentialsFile,
        athleteId: parseInt(program.id, 10) || (config as StravaConfig).athleteId,
        athlete: program.athlete,
        bikes: program.bikes,
        friends: program.friends,
        dates: program.dates || [], // array of date ranges, in seconds (not milliseconds)
        more: program.more,
        kml: program.path && program.kml ? path.resolve(program.path, program.kml) : program.kml,
        xml: program.path && program.xml ? path.resolve(program.path, program.xml) : program.xml,
        activities: program.activities,
        // activityFilter: _.without(program.filter || [], 'commute', 'nocommute'),
        commuteOnly: (program.filter || []).indexOf('commute') >= 0 ? true : false,
        nonCommuteOnly: (program.filter || []).indexOf('nocommute') >= 0 ? true : false,
        imperial: program.imperial,
        segments: program.segments, // Will be true or 'flat'
        verbose: program.verbose || 9
      };

      opts.dateRanges = []; // used for kml file
      if (opts.dates && opts.dates.length) {
        console.log('Date ranges: ');
        opts.dates.forEach(range => {
          let tAfter = dateutil.toSortableString(1000 * range.after).replace(/\//g, '-');
          let tBefore = dateutil.toSortableString(1000 * range.before).replace(/\//g, '-');
          console.log('  From ' + tAfter + ' to ' + tBefore);
          opts.dateRanges.push({ after: tAfter.slice(0, 10), before: tBefore.slice(0, 10) });
        });
      }

      let main = new Main(opts);
      return main.run();
    })
    .then(resp => {
      console.log('done');
      // process.exit(0);     // don't do this else files will not be saved
    })
    .catch(err => {
      console.log('Error: ' + err.message);
    });
}

function commaList(val) {
  return val.split(',');
}

function dateList(val): DateRange[] {
  let result: DateRange[] = [];
  let ranges = val.split(',');
  for (let idx = 0; idx < ranges.length; ++idx) {
    let range = ranges[idx];
    let p = range.split('-');
    let t0;
    let t1;
    try {
      if (p && p.length > 1) {
        t0 = dateStringToDate(p[0]);
        t1 = dateStringToDate(p[1]) + DAY;
      } else if (idx === ranges.length - 1) {
        t0 = dateStringToDate(range);
        t1 = new Date().getTime(); // now
      } else {
        t0 = dateStringToDate(range);
        t1 = t0 + DAY;
      }
    } catch (e) {
      console.log(e.toString());
      process.exit(1);
    }
    result.push({ after: t0 / 1000, before: t1 / 1000 });
  }
  return result;
}

function dateStringToDate(s: string): EpochMilliseconds {
  let p: string[] = s.match(/^(\d{4})(\d\d)(\d\d)$/);
  if (p) {
    return new Date(parseInt(p[1], 10), parseInt(p[2], 10) - 1, parseInt(p[3], 10)).getTime();
  } else {
    throw new Error('Invalid date');
  }
}

run();

//function promptSingleLine(str, fn) {
//    process.stdout.write(str);
//    process.stdin.setEncoding('utf8');
//    process.stdin.once('data', function (val) {
//        fn(val);
//    }).resume();
//}
[];
