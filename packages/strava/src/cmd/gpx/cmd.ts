import type { Command } from '@epdoc/cliapp';
import type { DateRanges } from '@epdoc/daterange';
import type * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import { Api } from '../../dep.ts';
import type * as Stream from '../../stream/mod.ts';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

export const cmdConfig: Options.Config = {
  replace: { cmd: 'GPX' },
  options: {
    date: true,
    output: true,
    laps: true,
    commute: true,
    type: true,
    // Note: imperial and dryRun are global options defined in root command
  },
};

type GpxCmdOpts = {
  date: DateRanges;
  output: string;
  laps: boolean;
  commute?: Options.CommuteType;
  type: Api.Schema.ActivityType[];
};

/**
 * Command to generate GPX files for Strava activities.
 *
 * This command creates individual GPX files for each activity with support for:
 * - Track points with lat/lon, elevation, and timezone-aware timestamps
 * - Lap waypoints showing where lap button was pressed (--laps flag)
 * - Activity type filtering (--type)
 * - Commute filtering (--commute yes|no|all)
 * - Date range filtering (--date, required)
 *
 * Each activity generates a separate GPX file named YYYYMMDD_Activity_Name.gpx
 * in the specified output folder.
 *
 * The command delegates business logic to ctx.app.getKml() (which handles both
 * KML and GPX formats) while handling CLI concerns like option validation and
 * error display.
 *
 * @example
 * ```bash
 * # Generate GPX files for January 2024 activities with lap markers
 * deno run -A ./packages/strava/main.ts gpx \
 *   --date 20240101-20240131 \
 *   --output ./gpx-files/ \
 *   --laps
 *
 * # Generate GPX for rides only
 * deno run -A ./packages/strava/main.ts gpx \
 *   --date 20240101-20241231 \
 *   --output ./rides/ \
 *   --type Ride
 * ```
 */
export class GpxCmd extends Options.BaseSubCmd {
  constructor() {
    super('gpx', 'Generate GPX files from Strava activities.');
  }

  /**
   * Initializes the GPX command with its action handler and options.
   *
   * Sets up the command action that:
   * 1. Validates required options (--date and --output)
   * 2. Ensures output is a folder path (not a .kml file)
   * 3. Handles activity type filtering
   * 4. Initializes app with Strava API and user settings
   * 5. Delegates to ctx.app.getKml() for business logic
   *
   * @param ctx Application context with logging and app instance
   * @returns Promise resolving to the configured command instance
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async (gpxOpts: GpxCmdOpts, cmd: Command) => {
      try {
        // Validate required options - show help and exit on validation failure
        if (!gpxOpts.date || !gpxOpts.date.hasRanges()) {
          ctx.log.error.error('--date is required. Specify date range(s) (e.g., 20240101-20241231)')
            .emit();
          console.error(''); // blank line before help
          this.cmd.outputHelp();
          Deno.exit(1);
        }

        if (!gpxOpts.output) {
          ctx.log.error.error('--output is required. Specify output folder (e.g., -o ./gpx-files/)')
            .emit();
          console.error(''); // blank line before help
          this.cmd.outputHelp();
          Deno.exit(1);
        }

        // Validate output is not a .kml file
        if (/\.kml$/i.test(gpxOpts.output)) {
          ctx.log.error.error(
            'Output must be a folder path for GPX generation, not a .kml file. Use the kml command for KML output.',
          ).emit();
          console.error(''); // blank line before help
          this.cmd.outputHelp();
          Deno.exit(1);
        }

        const opts: Stream.ActivityOpts & Stream.CommonOpts = {
          activities: true,
          date: gpxOpts.date,
          output: gpxOpts.output as FS.Path,
          laps: gpxOpts.laps,
          commute: gpxOpts.commute,
          type: [],
          imperial: cmd.opts().imperial,
        };

        // Handle activity type filtering
        if (_.isArray(gpxOpts.type)) {
          if (Api.isActivityTypeArray(gpxOpts.type)) {
            opts.type = [];
          } else {
            ctx.log.error.error('Invalid activity types').emit();
            console.error(''); // blank line before help
            this.cmd.outputHelp();
            Deno.exit(1);
          }
        }

        await ctx.app.init(ctx, { strava: true, userSettings: true });

        await ctx.app.getKml(ctx, opts);
      } catch (e) {
        const err = _.asError(e);
        ctx.log.error.error(`Failed to generate GPX: ${err.message}`).emit();
        throw err;
      }
    });
    this.addOptions(cmdConfig);
    return Promise.resolve(this.cmd);
  }
}
