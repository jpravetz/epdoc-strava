import { parse } from '@std/flags';
import * as path from '@std/path';
import { App, type AppOpts, type StravaConfig } from './app/app.ts';
import projectConfig from './config/project.settings.json' with { type: 'json' };
import { type Dict, type EpochMilliseconds, readJson } from './fmt.ts';
import * as CliApp from '@epdoc/cliapp';

const DAY = 24 * 3600 * 1000;

async function main() {
  const home = Deno.env.get('HOME');
  const segmentsFile = path.join(home, '.strava', 'segments.json');
  const credentialsFile = path.join(home, '.strava', 'credentials.json');
  const userSettingsFile = path.join(home, '.strava', 'user.settings.json');

  let _segments: Dict;
  try {
    _segments = await readJson(segmentsFile);
  } catch (_e) {
    _segments = {};
  }

  let userConfig: Dict;
  try {
    userConfig = await readJson(userSettingsFile);
  } catch (_e) {
    userConfig = {};
  }

  const config = Object.assign({}, projectConfig, userConfig);

  const flags = parse(Deno.args, {
    string: ['dates', 'id', 'kml', 'xml', 'activities', 'segments', 'path'],
    boolean: ['athlete', 'friends', 'refresh', 'more', 'imperial', 'verbose'],
    alias: {
      d: 'dates',
      i: 'id',
      u: 'athlete',
      g: 'friends',
      k: 'kml',
      x: 'xml',
      r: 'refresh',
      a: 'activities',
      s: 'segments',
      m: 'more',
      y: 'imperial',
      p: 'path',
      v: 'verbose',
    },
  });

  const opts: AppOpts = {
    home: home,
    cwd: flags.path,
    config: config,
    refreshStarredSegments: flags.refresh,
    segmentsFile: segmentsFile,
    credentialsFile: credentialsFile,
    athleteId: parseInt(flags.id, 10) || (config as StravaConfig).athleteId,
    athlete: flags.athlete,
    friends: flags.friends,
    dates: [], // array of date ranges, in seconds (not milliseconds)
    more: flags.more,
    kml: flags.path && flags.kml ? path.join(flags.path, flags.kml) : flags.kml,
    xml: flags.path && flags.xml ? path.join(flags.path, flags.xml) : flags.xml,
    activities: flags.activities ? flags.activities.split(',') : [],
    commuteOnly: (flags.activities || []).indexOf('commute') >= 0 ? true : false,
    nonCommuteOnly: (flags.activities || []).indexOf('nocommute') >= 0 ? true : false,
    imperial: flags.imperial,
    segments: flags.segments, // Will be true or 'flat'
    verbose: flags.verbose || 9,
  };

  if (flags.dates) {
    const ranges = flags.dates.split(',');
    for (let idx = 0; idx < ranges.length; ++idx) {
      const range = ranges[idx];
      const p = range.split('-');
      let t0: EpochMilliseconds;
      let t1: EpochMilliseconds;
      try {
        if (p && p.length > 1) {
          t0 = new Date(p[0]).getTime();
          t1 = new Date(p[1]).getTime() + DAY;
        } else if (idx === ranges.length - 1) {
          t0 = new Date(range).getTime();
          t1 = new Date().getTime(); // now
        } else {
          t0 = new Date(range).getTime();
          t1 = t0 + DAY;
        }
      } catch (e) {
        console.error(e.toString());
        Deno.exit(1);
      }
      opts.dates.push({ after: t0 / 1000, before: t1 / 1000 });
    }
  }

  opts.dateRanges = []; // used for kml file
  if (opts.dates && opts.dates.length) {
    console.info('Date ranges: ');
    opts.dates.forEach((range) => {
      const tAfter = new Date(range.after * 1000).toISOString().slice(0, 10);
      const tBefore = new Date(range.before * 1000).toISOString().slice(0, 10);
      console.info('  From ' + tAfter + ' to ' + tBefore);
      opts.dateRanges.push({ after: tAfter, before: tBefore });
    });
  }

  const main = new App(opts);
  try {
    await main.run();
    console.info('done');
  } catch (err) {
    console.error('Error: ' + err.message);
  }
}

main();

type CliOpts = CliApp.Opts;

/**
 * The main command line interface.
 */
class Cli {
  /**
   * Runs the command line interface.
   * @param ctx The command line context.
   */
  async run(ctx: CliApp.ICtx<MsgBuilder, Logger>): Promise<void> {
    const customPkg: CliApp.DenoPkg = { description: 'Hacienda tools', name: 'main', version: pkg.version };
    const cmd = new CliApp.Command(customPkg);
    cmd.init(ctx);

    cmd.hook('preAction', (cmd, _actionCmd) => {
      const opts = cmd.opts();
      CliApp.configureLogging(ctx, opts);
    });

    const processCmd = new HaciendaCR.Convert.Cmd();
    const schemaCmd = new HaciendaCR.Schema.Cmd();

    cmd.addCommand(await processCmd.init(ctx));
    cmd.addCommand(await schemaCmd.init(ctx));

    cmd.addLogging(ctx);
    await cmd.parseOpts();
    // CliApp.configureLogging(ctx, opts);
  }
}

const ctx = new Context();
const app = new Cli();

// Use CliApp utility run method that adds logging and error handling
CliApp.run(ctx, () => app.run(ctx));
