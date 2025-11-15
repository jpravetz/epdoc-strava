import type { DateRanges } from '@epdoc/daterange';
import type { FileSpec } from '@epdoc/fs';
import type * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import type { Ctx } from '../dep.ts';
import * as Options from '../options/mod.ts';
import type * as Cmd from '../types.ts';

export const cmdConfig: Options.Config = {
  replace: { cmd: 'segments' },
  options: {
    dates: true,
    refresh: true,
    kml: true,
  },
};

type SegmentCmdOpts = {
  date?: DateRanges;
  refresh?: boolean;
  kml?: FileSpec;
  imperial?: boolean; // Global option from root command
};

/**
 * Command to manage and visualize starred segments.
 *
 * This command provides three modes of operation:
 * 1. **Refresh mode** (--refresh): Updates the cached segment metadata from Strava API
 * 2. **KML generation mode** (--kml <filename>): Generates a KML file of all starred segments
 * 3. **Display mode** (default): Shows a list of starred segments with optional effort analysis
 *
 * The command manages a local cache of segment metadata (distance, elevation, location)
 * stored in ~/.strava/user.segments.json. Segment coordinates are NOT cached and are
 * fetched on-demand when generating KML files.
 *
 * @example
 * ```bash
 * # Refresh starred segments cache from Strava
 * deno run -A ./packages/strava/main.ts segments --refresh
 *
 * # Generate KML file for all starred segments
 * deno run -A ./packages/strava/main.ts segments --kml segments.kml
 *
 * # Display starred segments with effort analysis
 * deno run -A ./packages/strava/main.ts segments --dates 20240101-20240630
 *
 * # Display all starred segments (from cache)
 * deno run -A ./packages/strava/main.ts segments
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
   * 2. Handle --refresh flag to update segment cache from Strava
   * 3. Handle --kml flag to generate KML file of all starred segments
   * 4. Default: Display list of starred segments with optional effort analysis
   *
   * @param ctx Application context with logging and app instance
   * @returns Promise resolving to the configured command instance
   */
  init(ctx: Ctx.Context): Promise<Cmd.Command> {
    this.cmd.init(ctx).action(async (opts: SegmentCmdOpts) => {
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

        // Handle --kml flag: generate KML file for all starred segments
        if (opts.kml) {
          const kmlOpts = {
            segments: 'only' as const, // Only segments, no activities
            output: opts.kml.path as FS.Path,
            date: opts.date,
            imperial: opts.imperial || false,
          };
          await ctx.app.getKml(ctx, kmlOpts);
          return; // Exit after KML generation
        }

        // Fetch segments with efforts if date specified
        const segmentOpts: {
          coordinates: boolean;
          efforts: boolean;
          dateRanges?: DateRanges;
        } = {
          coordinates: false, // Don't need coordinates for analysis
          efforts: false,
        };

        // If date specified, fetch efforts
        if (opts.date) {
          segmentOpts.efforts = true;
          segmentOpts.dateRanges = opts.date;
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
          if (segment.efforts && segment.efforts.length > 0) {
            const efforts = segment.efforts;
            ctx.log.info.text('Efforts:').count(efforts.length).emit();
            ctx.log.indent();
            // Show best 3 efforts
            const bestEfforts = efforts.slice(0, Math.min(3, efforts.length));
            bestEfforts.forEach((effort, index: number) => {
              const time = effort.elapsed_time || 0;
              const minutes = Math.floor(time / 60);
              const seconds = time % 60;
              const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
              const date = effort.start_date_local ? effort.start_date_local.slice(0, 10) : '';
              ctx.log.info.text(`${index + 1}.`).value(timeStr).text('on').value(date).emit();
            });
            ctx.log.outdent();
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
