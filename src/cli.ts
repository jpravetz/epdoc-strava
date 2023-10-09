const env = process.env['NODE_ENV'] || 'development';

import { Command, Option } from 'commander';
// import { DateRange, EpochMilliseconds, Main, MainOpts, ServerOpts, StravaConfig, logConsole } from 'epdoc-strava-lib';
import { delayPromise } from 'epdoc-util';
import open from 'open';
import os from 'os';
import path from 'path';
import pkg from '../package.json';
import { Server, ServerOpts } from './server';
import { StravaConfig } from './strava-config';
import { StravaContext } from './strava-context';
import { DateRange, EpochMilliseconds } from './types';
import { logConsole } from './util';
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
  let serverOpts: ServerOpts;
  let program: Command;

  // let config = new StravaConfig(configPath, { HOME: home });
  return new Promise((resolve, reject) => {
    return Promise.resolve()
      .then((resp) => {
        const configPath = path.resolve(__dirname, '../config/project.settings.json');
        serverOpts = { log: logConsole, open: openUrl };
        config = new StravaConfig(configPath, { HOME: os.homedir() }, serverOpts);
        return config.init();
      })
      .then(async (resp) => {
        program = new Command('strava');
        program.version(pkg.version);

        const options: Record<string, Option> = {
          dateRange: new Option(
            '-d, --dates <dates>',
            "comma separated list of activity date or date ranges in format '20141231-20150105,20150107'. If the last entry in the list is a single date then everything from that date until today will be included."
          ).argParser(dateList),
          athleteId: new Option('-i, --id <athleteId>', 'Athlete ID. Defaults to your login'),
          gearId: new Option('-i, --id <gearId>', 'Gear ID.'),
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
          bike: new Option(
            '-b, --bikes [filter]',
            'Include data for only the listed bikes. Defaults to all.'
          ).argParser(commaList),
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
            const ctx = new StravaContext(config, serverOpts);
            ctx
              .initApi()
              .then((resp) => {
                const valid = ctx.config.credentialsAreValid(0);
                logConsole.info(`Access token is ${valid ? 'valid' : 'expired'}`);
                resolve();
              })
              .catch((err) => {
                reject(err);
              });
          });
        authCommand
          .command('authorize')
          .description('Authorize user')
          .action(() => {
            const ctx = new StravaContext(config, serverOpts);
            ctx
              .initApi()
              .then((resp) => {
                return ctx.authorize();
              })
              .catch((err) => {
                reject(err);
              });
          });

        authCommand
          .command('authurl')
          .description('Get authorization URL')
          .action(() => {
            const ctx = new StravaContext(config, serverOpts);
            const server = new Server(config, serverOpts);
            const url = server.getAuthorizationUrl();
            logConsole.info(`Authorization URL = ${url}`);
            resolve();
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
          const athleteId = parseInt(apiCommand.opts().id, 10);
          const ctx = new StravaContext(config, serverOpts);
          return ctx
            .initApi()
            .then((resp) => {
              return ctx.strava.athletes.getLoggedInAthlete();
            })
            .then((resp) => {
              logConsole.info('athlete:\n' + JSON.stringify(resp, null, 2));
              resolve();
            });
        });

        apiCommand.addOption(options.gearId);
        apiCommand.command('gear').action(() => {
          logConsole.info(`path: ${program.opts().path}`);
          logConsole.info(`id: ${apiCommand.opts().id}`);
          const athleteId = parseInt(apiCommand.opts().id, 10);
          const ctx = new StravaContext(config, serverOpts);
          return ctx
            .initApi()
            .then((resp) => {
              return ctx.strava.gears.getGearById({ id: apiCommand.opts().id });
            })
            .then((resp) => {
              logConsole.info('gear:\n' + JSON.stringify(resp, null, 2));
              resolve();
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
        logConsole.info('done');
        // process.exit(0);     // don't do this else files will not be saved
      })
      .catch((err) => {
        logConsole.error(err.message);
      });
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
