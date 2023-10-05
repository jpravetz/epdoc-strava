const env = process.env['NODE_ENV'] || 'development';

import { Command, Option } from 'commander';
import { DateRange, EpochMilliseconds, Main, MainOpts, ServerOpts, StravaConfig, logConsole } from 'epdoc-strava-lib';
import { Dict, delayPromise } from 'epdoc-util';
import open from 'open';
import os from 'os';
import path from 'path';
import pkg from '../package.json';
// import { LogFunctions, logConsole } from 'epdoc-strava-lib/dist/src/util';
// import { Main, MainOpts } from './main-old';
// import { EpochMilliseconds, LogFunctions } from './util';

function openUrl(url: string): Promise<any> {
  return open(url, { wait: true });
}

const DAY = 24 * 3600 * 1000;

// const log: LogFunctions = {
//   info: (msg) => console.log('INFO: ' + msg),
//   debug: (msg) => console.log('DEBUG: ' + msg),
//   verbose: (msg) => {
//     return;
//   },
//   error: (msg) => console.log('ERROR: ' + msg),
//   warn: (msg) => console.log('WARN: ' + msg),
// };

//let Config = require('a5config').init(env, [__dirname + '/../config/project.settings.json'], {excludeGlobals: true});
//let config = Config.get();

async function run(): Promise<void> {
  let config: StravaConfig;
  let program: Command;
  let mainOpts: MainOpts = {
    openUrl: openUrl,
    log: logConsole,
  };

  // let config = new StravaConfig(configPath, { HOME: home });
  return Promise.resolve()
    .then((resp) => {
      const configPath = path.resolve(__dirname, '../config/project.settings.json');
      const serverOpts: ServerOpts = { log: logConsole, open: openUrl };
      config = new StravaConfig(configPath, { HOME: os.homedir() }, serverOpts);
      return config.read();
    })
    .then(async (resp) => {
      mainOpts.config = resp;

      program = new Command('strava');
      program.version(pkg.version);

      const options: Record<string, Option> = {
        dateRange: new Option(
          '-d, --dates <dates>',
          "comma separated list of activity date or date ranges in format '20141231-20150105,20150107'. If the last entry in the list is a single date then everything from that date until today will be included."
        ).argParser(dateList),
        athleteId: new Option('-i, --id <athleteId>', 'Athlete ID. Defaults to your login'),
        friends: new Option(
          '-g, --friends [opt]',
          'Show athlete friends list (Use --more a complete summary, otherwise id and name are displayed)'
        ),
        type: new Option('-t, --type [type]', 'Output file type').choices(['json', 'xml', 'kml']).default('json'),
        output: new Option('-o, --output [filename]', 'Output filename. Defaults to STDOUT.'),
        refresh: new Option(
          '-r, --refresh',
          'Refresh list of starred segments rather than using local stored copy. Will automatically refresh from server if there is no locally stored copy.'
        ),
        bike: new Option('-b, --bikes [filter]', 'Include data for only the listed bikes. Defaults to all.').argParser(
          commaList
        ),
        sport: new Option(
          '-s, --sport [filter]',
          "Inlcude data for only the listed sport types, as defined by Strava, 'Ride', 'EBikeRide', 'Hike', 'Walk', etc, and also 'commute', 'nocommute' and 'moto'"
        ).argParser(commaList),
        segment: new Option(
          '-s, --segments [opts]',
          "Retrieve starred segments. If not generating a KML file, segments are output to STDOUT. If generatin KML, will add efforts within date range to description if --more. Segments in KML are grouped into folders by location unless opts is set to 'flat'."
        ),
        more: new Option(
          '-m, --more',
          'When generating KML file, include additional detail info in KML description field'
        ),
        imperial: new Option('-y, --imperial', 'Use imperial units'),
        cwd: new Option('-p, --path <cwd>', 'Current folder').hideHelp(),
        verbose: new Option('-v, --verbose', 'Verbose messages'),
      };

      program.addOption(options.cwd).addOption(options.verbose);

      const authCommand = new Command('auth');
      authCommand
        .command('validate')
        .description('Test existing credentials for validity')
        .action(() => {
          console.log('validate');
          return delayPromise(1000);
        });
      authCommand
        .command('authorize')
        .description('Authorize user')
        .action(() => {
          const main = new Main(mainOpts);
          return main.auth();
        });

      const apiCommand = new Command('api');
      apiCommand.addOption(options.type);
      apiCommand.addOption(options.output);
      apiCommand.addOption(options.athleteId);
      apiCommand.addOption(options.more);
      apiCommand.addOption(options.imperial);
      apiCommand.command('athlete').action(() => {
        logConsole.info(`path: ${program.opts().path}`);
        logConsole.info(`id: ${apiCommand.opts().id}`);
        const athleteId = apiCommand.opts().id;
        const main = new Main(mainOpts);
        return main.auth().then((resp) => {
          return this.main.strava.getAthlete(athleteId).then((resp) => {
            logConsole.info('athlete:\n' + JSON.stringify(resp));
          });
        });
      });
      apiCommand
        .command('activity')
        .addOption(options.dateRange)
        .addOption(options.bike)
        .addOption(options.sport)
        .action(() => {
          console.log('activity');
          return delayPromise(1000);
        });
      apiCommand
        .command('segment')
        .addOption(options.dateRange)
        .addOption(options.bike)
        .addOption(options.sport)
        .addOption(options.refresh)
        .action(() => {
          console.log('segment');
          return delayPromise(1000);
        });
      apiCommand.command('friends').action(() => {
        console.log('friends');
        return delayPromise(1000);
      });

      program.addCommand(authCommand).addCommand(apiCommand);

      return program.parseAsync(process.argv);
    })
    .then((resp) => {
      const cmdOpts: Dict = program.opts();

      mainOpts.refreshStarredSegments = cmdOpts.refresh;
      mainOpts.segmentsCachePath = config.segmentsCachePath;
      // credentialsFile: credentialsFile;
      mainOpts.athleteId = parseInt(cmdOpts.id, 10); //  || (config as StravaConfig).athleteId;
      mainOpts.athlete = cmdOpts.athlete;
      mainOpts.selectedBikes = cmdOpts.bikes;
      mainOpts.friends = cmdOpts.friends;
      mainOpts.dates = cmdOpts.dates || []; // array of date ranges, in seconds (not milliseconds)
      mainOpts.more = cmdOpts.more;
      mainOpts.kml = cmdOpts.path && cmdOpts.kml ? path.resolve(cmdOpts.path, cmdOpts.kml) : cmdOpts.kml;
      mainOpts.xml = cmdOpts.path && cmdOpts.xml ? path.resolve(cmdOpts.path, cmdOpts.xml) : cmdOpts.xml;
      mainOpts.activities = cmdOpts.activities;
      // activityFilter= _.without(cmdOpts.filter || [], 'commute', 'nocommute'),
      mainOpts.commuteOnly = (cmdOpts.filter || []).indexOf('commute') >= 0 ? true : false;
      mainOpts.nonCommuteOnly = (cmdOpts.filter || []).indexOf('nocommute') >= 0 ? true : false;
      mainOpts.imperial = cmdOpts.imperial;
      // auth= cmdOpts.auth;
      mainOpts.segments = cmdOpts.segments; // Will be true or 'flat'
      mainOpts.verbose = cmdOpts.verbose || 9;

      mainOpts.dateRanges = []; // used for kml file
      if (mainOpts.dates && mainOpts.dates.length) {
        mainOpts.log.info('Date ranges: ');
        mainOpts.dates.forEach((range) => {
          // XXX what does toSortableString do?
          // const tAfter = dateutil.toSortableString(1000 * range.after).replace(/\//g, '-');
          // const tBefore = dateutil.toSortableString(1000 * range.before).replace(/\//g, '-');
          // mainOpts.log.info('  From ' + tAfter + ' to ' + tBefore);
          // mainOpts.dateRanges.push({ after: tAfter.slice(0, 10), before: tBefore.slice(0, 10) });
        });
      }

      // program
      //   .command('auth <action>')
      //   .description('Test existing credentials for validity')
      //   .command('validate')
      //   .description('Validate existing credentials')
      //   .action(() => {
      //     console.log(`auth validate`);
      //     return delayPromise(2000).then((resp) => {
      //       const main = new Main(mainOpts);
      //       return main.run();
      //     });
      //   });

      // const main = new Main(mainOpts);
      // return main.run();
    })
    .then((resp) => {
      mainOpts.log.info('done');
      // process.exit(0);     // don't do this else files will not be saved
    })
    .catch((err) => {
      mainOpts.log.error(err.message);
    });
}

function commaList(val: string) {
  return val.split(',');
}

function dateList(val: string): DateRange[] {
  const result: DateRange[] = [];
  const ranges = val.split(',');
  for (let idx = 0; idx < ranges.length; ++idx) {
    const range = ranges[idx];
    const p = range.split('-');
    let t0: EpochMilliseconds;
    let t1: EpochMilliseconds;
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
      logConsole.error(e.toString());
      process.exit(1);
    }
    result.push({ after: t0 / 1000, before: t1 / 1000 });
  }
  return result;
}

function dateStringToDate(s: string): EpochMilliseconds {
  const p: string[] = s.match(/^(\d{4})(\d\d)(\d\d)$/);
  if (p) {
    return new Date(parseInt(p[1], 10), parseInt(p[2], 10) - 1, parseInt(p[3], 10)).getTime();
  } else {
    throw new Error('Invalid date');
  }
}

run();
