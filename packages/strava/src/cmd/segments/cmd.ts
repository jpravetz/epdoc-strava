import { _ } from '@epdoc/type';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

export const cmdConfig: Options.Config = {
  replace: { cmd: 'segments' },
  options: {
    dates: true,
    refresh: true,
    dryRun: true,
  },
};

/**
 * Command to analyze starred segments with effort times and refresh segment data.
 *
 * This command provides segment-specific functionality separate from KML generation:
 * - Fetches starred segments from Strava API
 * - Analyzes effort times for date ranges
 * - Refreshes cached segment data (--refresh flag)
 * - Displays segment performance statistics
 *
 * Note: This command is for segment analysis and data management. To output segments
 * to KML files, use the `kml` command with `--segments` option instead.
 *
 * @example
 * ```bash
 * # Refresh starred segments cache
 * deno run -A ./packages/strava/main.ts segments --refresh
 *
 * # Analyze segment efforts for date range
 * deno run -A ./packages/strava/main.ts segments --dates 20240101-20240630
 * ```
 */
export class SegmentsCmd extends Options.BaseSubCmd {
  constructor() {
    super('segments', 'Analyze starred segments with effort times.');
  }

  /**
   * Initializes the segments command with its action handler and options.
   *
   * Sets up the command action that will:
   * 1. Initialize app with Strava API and user settings
   * 2. Fetch and cache starred segments (if --refresh specified)
   * 3. Analyze segment efforts for specified date ranges
   * 4. Display performance statistics
   *
   * Note: Full implementation is pending (TODO).
   *
   * @param ctx Application context with logging and app instance
   * @returns Promise resolving to the configured command instance
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async (_opts: Record<string, unknown>) => {
      try {
        await ctx.app.init(ctx, { strava: true, userSettings: true });
        // TODO: Implement segments analysis functionality
        ctx.log.info.text('Segments command not yet implemented').emit();
      } catch (e) {
        const err = _.asError(e);
        ctx.log.error.error(`Failed to analyze segments: ${err.message}`).emit();
        throw err;
      }
    });
    this.addOptions(cmdConfig);
    return Promise.resolve(this.cmd);
  }
}
