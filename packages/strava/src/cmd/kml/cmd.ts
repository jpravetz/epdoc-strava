import { _ } from '@epdoc/type';
import type * as Kml from '../../kml/mod.ts';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

export const cmdConfig: Options.Config = {
  replace: { cmd: 'KML' },
  options: {
    date: true,
    output: true,
    activities: true,
    segments: true,
    more: true,
    laps: true,
    commute: true,
    // Note: imperial and dryRun are global options defined in root command
  },
};

// export type KmlOpts = {
//   more: boolean;
//   date: DateRanges;
//   activities: boolean;
//   segments: boolean;
//   commute: boolean;
// };

/**
 * Command to generate KML files for visualizing Strava data in Google Earth.
 *
 * This command creates KML files from Strava activities and segments with support for:
 * - Activity routes color-coded by type (Ride, Run, Swim, etc.)
 * - Lap markers showing where lap button was pressed (--laps flag)
 * - Starred segments organized by region or flat
 * - Custom line styles for different activity types
 * - Imperial or metric units (--imperial global flag)
 * - Commute filtering (--commute yes|no|all)
 * - Date range filtering (--date, required)
 *
 * The command delegates business logic to ctx.app.getKml() while handling CLI concerns
 * like option validation and error display.
 *
 * @example
 * ```bash
 * # Generate KML for January 2024 activities with lap markers
 * deno run -A ./packages/strava/main.ts kml \
 *   --date 20240101-20240131 \
 *   --output january.kml \
 *   --laps
 *
 * # Generate KML for starred segments only
 * deno run -A ./packages/strava/main.ts kml \
 *   --date 20240101-20241231 \
 *   --output segments.kml \
 *   --segments only
 * ```
 */
export class KmlCmd extends Options.BaseSubCmd {
  constructor() {
    super('kml', 'Generate KML files from Strava activities and segments.');
  }

  /**
   * Initializes the KML command with its action handler and options.
   *
   * Sets up the command action that:
   * 1. Validates required options (--date and --output)
   * 2. Sets default values (activities: true if neither activities nor segments specified)
   * 3. Handles segment modes ('only' excludes activities, 'flat' for flat folder structure)
   * 4. Initializes app with Strava API and user settings
   * 5. Delegates to ctx.app.getKml() for business logic
   *
   * @param ctx Application context with logging and app instance
   * @returns Promise resolving to the configured command instance
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async (kmlOpts: Kml.Opts) => {
      try {
        // Validate required options - show help and exit on validation failure
        if (!kmlOpts.date || !kmlOpts.date.hasRanges()) {
          ctx.log.error.error('--date is required. Specify date range(s) (e.g., 20240101-20241231)').emit();
          console.error(''); // blank line before help
          this.cmd.outputHelp();
          Deno.exit(1);
        }

        if (!kmlOpts.output) {
          ctx.log.error.error('--output is required. Specify output filename (e.g., -o output.kml)').emit();
          console.error(''); // blank line before help
          this.cmd.outputHelp();
          Deno.exit(1);
        }

        // Default to all activities if neither activities nor segments is specified
        if (!kmlOpts.activities && !kmlOpts.segments) {
          kmlOpts.activities = true;
        }

        // Handle segments modes
        if (kmlOpts.segments === 'only') {
          // "only" mode: exclude activities, include segments with default folder structure
          kmlOpts.activities = false;
        }
        // Note: 'flat' mode is handled by the KML generator directly based on segments value

        await ctx.app.init(ctx, { strava: true, userSettings: true });
        await ctx.app.getKml(ctx, kmlOpts);
        // TODO: Implement KML generation functionality
      } catch (e) {
        const err = _.asError(e);
        ctx.log.error.error(`Failed to generate KML: ${err.message}`).emit();
        throw err;
      }
    });
    this.addOptions(cmdConfig);
    return Promise.resolve(this.cmd);
  }
}
