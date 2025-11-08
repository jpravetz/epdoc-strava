import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import { assert } from '@std/assert/assert';
import * as BikeLog from '../bikelog/mod.ts';
import { Kml } from '../cmd/dep.ts';
import rawConfig from '../config.json' with { type: 'json' };
import type * as Ctx from '../context.ts';
import { Api } from '../dep.ts';
import type * as App from './types.ts';

const home = Deno.env.get('HOME');
assert(home, 'Environment variable HOME is missing');
assert(
  _.isDict(rawConfig) && 'paths' in rawConfig && _.isDict(rawConfig.paths),
  'Invalid application configuration',
);
const lessRaw = _.deepCopy(rawConfig, { replace: { 'HOME': home }, pre: '${', post: '}' }) as App.ConfigFile;
const configPaths = lessRaw.paths;

/**
 * Main application class that handles Strava API interactions and business logic.
 * This class is designed to be reusable across different interfaces (CLI, web, etc.).
 */
export class Main {
  #api: Api.Api<Ctx.MsgBuilder, Ctx.Logger>;
  athlete?: Api.Schema.DetailedAthlete;
  userSettings?: App.UserSettings;
  notifyOffline = false;

  constructor() {
    // Initialize with defaults
    this.#api = new Api.Api(configPaths.userCreds, [{ path: configPaths.clientCreds }, { env: true }]);
  }

  /**
   * Get the API client instance.
   * @throws Error if API not initialized
   */
  get api(): Api.Api<Ctx.MsgBuilder, Ctx.Logger> {
    if (!this.#api) {
      throw new Error('API not initialized. Call initClient() first.');
    }
    return this.#api;
  }

  /**
   * Initialize the application with specified services.
   * @param ctx - Application context
   * @param opts - Initialization options specifying what to initialize
   */
  async init(ctx: Ctx.Context, opts: App.Opts = {}): Promise<void> {
    if (opts.config) {
      // TODO: Load configuration files
    }

    if (opts.strava) {
      await this.#api.init(ctx);
    }

    if (opts.userSettings) {
      this.userSettings = await new FS.File(configPaths.userSettings).readJson();
    }
  }

  /**
   * Check if internet access is available.
   * @param _ctx - Application context (unused for now)
   * @returns Promise resolving to true if online
   */
  checkInternetAccess(_ctx: Ctx.Context): Promise<boolean> {
    // Simple internet check - for now just return true
    // TODO: Implement actual internet connectivity check
    return Promise.resolve(true);
  }

  /**
   * Set the athlete ID for API calls.
   * @param _id - Athlete ID to set
   */
  setAthleteId(_id: string): Promise<void> {
    // TODO: Implement athlete ID storage and usage
    return Promise.resolve();
  }

  /**
   * Retrieve athlete information from Strava API.
   * @param ctx - Application context for logging
   * @param athleteId - Optional specific athlete ID to retrieve
   */
  async getAthlete(ctx: Ctx.Context, athleteId?: Api.Schema.AthleteId): Promise<void> {
    try {
      this.athlete = await this.api.getAthlete(ctx, athleteId);
      ctx.log.info.h2(`Retrieved athlete: ${this.athlete.firstname} ${this.athlete.lastname}`).emit();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      ctx.log.error.error(`Failed to get athlete: ${errorMsg}`).emit();
      throw err;
    }
  }

  async getKml(ctx: Ctx.Context, kmlOpts: Kml.Opts): Promise<void> {
    // Initialize KML generator with options and line styles
    const kml = new Kml.Main(kmlOpts);
    if (this.userSettings && this.userSettings.lineStyles) {
      kml.setLineStyles(ctx, this.userSettings.lineStyles);
    }

    // Validate that at least activities or segments is requested
    if (!kmlOpts.activities && !kmlOpts.segments) {
      throw new Error('When writing KML, select either segments, activities, or both');
    }

    let activities: Api.Activity.Base[] = [];
    const segments: any[] = []; // TODO: Implement segment fetching

    // Fetch activities if requested
    if (kmlOpts.activities && kmlOpts.date) {
      ctx.log.info.text('Fetching activities for date ranges').emit();

      // Get athlete ID (default to authenticated user)
      const athleteId = this.athlete?.id || 0;

      // Get activities for each date range
      for (const dateRange of kmlOpts.date.ranges) {
        const opts: Api.ActivityOpts = {
          athleteId,
          query: {
            per_page: 200,
            after: dateRange.after ? Math.floor(dateRange.after.getTime() / 1000) : 0,
            before: dateRange.before ? Math.floor(dateRange.before.getTime() / 1000) : 0,
          },
        };

        const rangeActivitiesData = await this.api.getActivities(ctx, opts);

        // Convert Dict[] to Activity.Base[]
        for (const data of rangeActivitiesData) {
          const activity = new Api.Activity.Base(data as unknown as Api.Schema.SummaryActivity);
          activities.push(activity);
        }
      }

      ctx.log.info.text(`Found ${activities.length} activities`).emit();

      // Filter activities based on commute option
      if (kmlOpts.commute === 'yes') {
        activities = activities.filter((a) => a.data.commute);
      } else if (kmlOpts.commute === 'no') {
        activities = activities.filter((a) => !a.data.commute);
      }

      // Fetch coordinates for activities
      ctx.log.info.text('Fetching coordinates for activities').emit();
      for (const activity of activities) {
        try {
          const coords = await this.api.getStreamCoords(
            ctx,
            'activities' as Api.Schema.StreamKeyType,
            activity.id,
            activity.name,
          );
          if (coords && coords.length > 0) {
            activity.coordinates = coords;
          }
        } catch (err) {
          ctx.log.warn.text(`Failed to fetch coordinates for activity ${activity.id}`).emit();
        }
      }
    }

    // TODO: Fetch segments if requested
    // if (kmlOpts.segments) {
    //   ctx.log.info.text('Fetching starred segments').emit();
    //   // Implementation needed
    // }

    // Generate KML file
    const outputPath = typeof kmlOpts.output === 'string'
      ? kmlOpts.output
      : kmlOpts.output?.path
      ? kmlOpts.output.path
      : 'Activities.kml';

    ctx.log.info.text(`Generating KML file: ${outputPath}`).emit();
    await kml.outputData(outputPath, activities, segments);
    ctx.log.info.h2(`KML file generated successfully`).emit();
  }

  async getPdf(ctx: Ctx.Context, pdfOpts: BikeLog.Opts): Promise<void> {
    ctx.log.info.text('Generating PDF/XML for Adobe Acrobat Forms').emit();

    let activities: Api.Activity.Base[] = [];

    // Fetch activities if we have date ranges
    if (pdfOpts.dates && pdfOpts.dates.hasRanges()) {
      ctx.log.info.text('Fetching activities for date ranges').emit();

      // Get athlete ID (default to authenticated user)
      const athleteId = this.athlete?.id || 0;

      // Get activities for each date range
      for (const dateRange of pdfOpts.dates.ranges) {
        const opts: Api.ActivityOpts = {
          athleteId,
          query: {
            per_page: 200,
            after: dateRange.after ? Math.floor(dateRange.after.getTime() / 1000) : 0,
            before: dateRange.before ? Math.floor(dateRange.before.getTime() / 1000) : 0,
          },
        };

        const rangeActivitiesData = await this.api.getActivities(ctx, opts);

        // Convert Dict[] to Activity.Base[]
        for (const data of rangeActivitiesData) {
          const activity = new Api.Activity.Base(data as unknown as Api.Schema.SummaryActivity);
          activities.push(activity);
        }
      }

      ctx.log.info.text(`Found ${activities.length} activities`).emit();

      // We don't need coordinates for XML generation, but we do need detailed activity data
      // TODO: Optionally fetch detailed activity data if more info is needed
    } else {
      ctx.log.warn.text('No date ranges specified, will generate empty XML').emit();
    }

    // Prepare bikes dict from athlete data
    const bikes: Record<string, any> = {};
    if (this.athlete && 'bikes' in this.athlete) {
      const athleteBikes = (this.athlete as any).bikes;
      if (_.isArray(athleteBikes)) {
        athleteBikes.forEach((bike: any) => {
          if (bike && bike.id) {
            bikes[bike.id] = bike;
          }
        });
      }
    }

    // Create Bikelog instance with options
    const bikelogOpts: BikeLog.OutputOpts = {
      more: pdfOpts.more,
      dates: pdfOpts.dates,
      bikes,
    };

    const bikelog = new BikeLog.Bikelog(bikelogOpts);

    // Generate output file path
    const outputPath = typeof pdfOpts.output === 'string'
      ? pdfOpts.output
      : pdfOpts.output?.path
      ? pdfOpts.output.path
      : 'bikelog.xml';

    if (pdfOpts.dryRun) {
      ctx.log.info.text(`Dry run: would generate XML file: ${outputPath}`).emit();
      ctx.log.info.text(`Would process ${activities.length} activities`).emit();
      return;
    }

    ctx.log.info.text(`Generating XML file: ${outputPath}`).emit();
    await bikelog.outputData(outputPath, activities);
    ctx.log.info.h2(`PDF/XML file generated successfully`).emit();
  }
}
