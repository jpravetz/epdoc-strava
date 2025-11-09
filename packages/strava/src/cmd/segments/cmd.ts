import type { DateRanges } from '@epdoc/daterange';
import { _ } from '@epdoc/type';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';
import * as Segment from '../../segment/mod.ts';

export const cmdConfig: Options.Config = {
  replace: { cmd: 'segments' },
  options: {
    dates: true,
    refresh: true,
  },
};

type SegementCmdOpts = {
  date?: DateRanges;
  refresh: true;
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
    this.cmd.init(ctx).action(async (opts: SegementCmdOpts) => {
      try {
        await ctx.app.init(ctx, { strava: true, userSettings: true });

        // Ensure we have athlete info
        if (!ctx.app.athlete) {
          await ctx.app.getAthlete(ctx);
        }

        // Handle --refresh flag: refresh the segment cache from Strava API
        if (opts.refresh) {
          await ctx.app.refreshStarredSegments(ctx);
          ctx.log.info.h2('Segment cache refreshed successfully').emit();
          return; // Exit after refresh
        }

        // Fetch segments with efforts if dates specified
        const segmentOpts: any = {
          coordinates: false, // Don't need coordinates for analysis
          efforts: false,
        };

        // If dates specified, fetch efforts
        if ('dates' in opts && opts.dates) {
          segmentOpts.efforts = true;
          segmentOpts.dateRanges = opts.dates;
        }

        const segments = await ctx.app.getSegments(ctx, segmentOpts);

        if (segments.length === 0) {
          ctx.log.info.text('No starred segments found').emit();
          return;
        }

        // Display segment summary
        ctx.log.info.section('Starred Segments').emit();
        ctx.log.indent();

        segments.forEach((segment) => {
          ctx.log.info.label(segment.name).emit();
          ctx.log.indent();
          ctx.log.info.text('Distance:').value(`${(segment.distance / 1000).toFixed(2)} km`).emit();
          if (segment.country) {
            ctx.log.info.text('Location:').value(
              segment.state ? `${segment.state}, ${segment.country}` : segment.country,
            ).emit();
          }

          // Display efforts if available
          if ((segment as any).efforts) {
            const efforts = (segment as any).efforts;
            ctx.log.info.text('Efforts:').count(efforts.length).emit();
            if (efforts.length > 0) {
              ctx.log.indent();
              // Show best 3 efforts
              const bestEfforts = efforts.slice(0, Math.min(3, efforts.length));
              bestEfforts.forEach((effort: any, index: number) => {
                const time = effort.elapsed_time || 0;
                const minutes = Math.floor(time / 60);
                const seconds = time % 60;
                const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                const date = effort.start_date_local ? effort.start_date_local.slice(0, 10) : '';
                ctx.log.info.text(`${index + 1}.`).value(timeStr).text('on').value(date).emit();
              });
              ctx.log.outdent();
            }
          }
          ctx.log.outdent();
        });

        ctx.log.outdent();
        ctx.log.info.section().emit();
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
