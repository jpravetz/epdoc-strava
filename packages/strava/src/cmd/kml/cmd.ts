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
    commute: true,
    dryRun: true,
    // Note: imperial is a global option defined in root command
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
 * Command to generate KML files from Strava data.
 * Delegates business logic to the app layer for reusability.
 */
export class KmlCmd extends Options.BaseSubCmd {
  constructor() {
    super('kml', 'Generate KML files from Strava activities and segments.');
  }

  /**
   * Initialize the KML command with its action handler.
   * @param ctx - Application context
   * @returns Promise resolving to the configured command
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
