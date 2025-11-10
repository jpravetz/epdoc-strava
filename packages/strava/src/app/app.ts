import type { DateRanges } from '@epdoc/daterange';
import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import { assert } from '@std/assert/assert';
import * as BikeLog from '../bikelog/mod.ts';
import rawConfig from '../config.json' with { type: 'json' };
import type * as Ctx from '../context.ts';
import { Api } from '../dep.ts';
import * as Kml from '../kml/mod.ts';
import * as Segment from '../segment/mod.ts';
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
 * Main application class handling Strava API interactions and core business logic.
 *
 * This class serves as the central coordinator for all Strava-related operations,
 * implementing business logic that is independent of the user interface. It can be
 * used from CLI commands, web interfaces, or any other front-end.
 *
 * Key responsibilities:
 * - Strava API initialization and authentication
 * - Athlete profile retrieval
 * - Activity fetching with date range filtering
 * - KML file generation for Google Earth visualization
 * - Adobe Acroforms XML generation for bikelog PDF forms
 * - User settings and configuration management
 *
 * The class follows the pattern of delegating presentation concerns to commands while
 * containing all domain logic here for reusability.
 *
 * @example
 * ```ts
 * const app = new Main();
 * await app.init(ctx, { strava: true, userSettings: true });
 * await app.getAthlete(ctx);
 * await app.getKml(ctx, { activities: true, date: dateRanges, output: 'output.kml' });
 * ```
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
   * Gets the initialized Strava API client instance.
   *
   * @returns The API client configured with user credentials
   * @throws Error if API not initialized (should not happen in normal usage)
   */
  get api(): Api.Api<Ctx.MsgBuilder, Ctx.Logger> {
    if (!this.#api) {
      throw new Error('API not initialized. Call initClient() first.');
    }
    return this.#api;
  }

  /**
   * Initializes application services based on specified options.
   *
   * This method selectively initializes only the services needed for a given operation,
   * avoiding unnecessary initialization overhead. Services are initialized in order:
   * 1. Configuration files (if opts.config is true)
   * 2. Strava API with OAuth authentication (if opts.strava is true)
   * 3. User settings from ~/.strava/user.settings.json (if opts.userSettings is true)
   *
   * @param ctx Application context with logging
   * @param [opts={}] Initialization options specifying which services to initialize
   * @param [opts.config] Initialize configuration files
   * @param [opts.strava] Initialize Strava API client with authentication
   * @param [opts.userSettings] Load user settings (line styles, bikes, etc.)
   *
   * @example
   * ```ts
   * // Initialize only what's needed for athlete command
   * await app.init(ctx, { strava: true, userSettings: true });
   *
   * // Initialize everything
   * await app.init(ctx, { config: true, strava: true, userSettings: true });
   * ```
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
  setAthleteId(_id: Api.Schema.AthleteId): Promise<void> {
    // TODO: Implement athlete ID storage and usage
    return Promise.resolve();
  }

  /**
   * Retrieves athlete profile information from Strava API.
   *
   * Fetches the authenticated athlete's profile (or a specific athlete if ID provided)
   * and stores it in the `athlete` property. The profile includes:
   * - Name, location (city, state, country)
   * - Athlete ID
   * - List of bikes and shoes
   *
   * @param ctx Application context with logging
   * @param [athleteId] Optional specific athlete ID (defaults to authenticated user)
   *
   * @example
   * ```ts
   * await app.getAthlete(ctx);
   * console.log(app.athlete?.firstname, app.athlete?.bikes);
   * ```
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

  /**
   * Generates a KML file from Strava activities or segments for Google Earth visualization.
   *
   * This method orchestrates the complete KML generation workflow:
   * 1. Initializes KML generator with user-configured line styles
   * 2. Validates that activities or segments are requested
   * 3. Fetches activities for specified date ranges with filtering
   * 4. Optionally fetches detailed activity data for lap markers (--laps flag)
   * 5. Fetches coordinates for each activity from Strava streams
   * 6. Applies commute filtering if specified
   * 7. Generates KML file with proper styling and organization
   *
   * The generated KML includes:
   * - Activity routes as color-coded LineStrings
   * - Optional lap markers as Point placemarks (if --laps enabled)
   * - Segment routes organized by region (if --segments enabled)
   *
   * @param ctx Application context with logging
   * @param kmlOpts KML generation options including:
   * @param kmlOpts.activities Include paths of activities within the date range in KML output
   * @param kmlOpts.date Required date ranges for activity filtering
   * @param kmlOpts.output Required output file path
   * @param kmlOpts.laps Enable lap marker output
   * @param kmlOpts.commute Filter commute activities ('yes' | 'no' | 'all')
   * @param kmlOpts.more Include detailed descriptions
   * @param kmlOpts.efforts Include effort data. Only applicable with --more
   * @param kmlOpts.imperial Use imperial units instead of metric
   *
   * @throws Error if neither activities nor segments is requested
   *
   * @example
   * ```ts
   * await app.getKml(ctx, {
   *   activities: true,
   *   laps: true,
   *   date: dateRanges,
   *   output: 'rides.kml',
   *   commute: 'no'
   * });
   * ```
   */
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
    let segments: Segment.Data[] = [];

    if (kmlOpts.activities) {
      assert(kmlOpts.date);
      activities = await this.getKmlActivities(ctx, kmlOpts);
      // Attach starred segment efforts if --efforts flag is enabled
      if (kmlOpts.efforts && activities.length > 0) {
        await this.attachStarredSegments(ctx, activities);
      }
    }

    // Fetch segments if requested
    if (kmlOpts.segments) {
      segments = await this.getKmlSegments(ctx, kmlOpts);
    }

    if (activities.length || segments.length) { // Generate KML file
      const outputPath = typeof kmlOpts.output === 'string'
        ? kmlOpts.output
        : kmlOpts.output?.path
        ? kmlOpts.output.path
        : 'Activities.kml';

      ctx.log.info.text('Generating KML file').fs(outputPath).emit();
      ctx.log.indent();
      await kml.outputData(ctx, outputPath, activities, segments);
      ctx.log.outdent();
      ctx.log.info.h2('KML file generated successfully').fs(outputPath).emit();
    } else {
      ctx.log.info.warn('No activities or segments found for the specified criteria').emit();
    }
  }

  async getKmlActivities(
    ctx: Ctx.Context,
    kmlOpts: Kml.ActivityOpts & Kml.CommonOpts,
  ): Promise<Api.Activity.Base[]> {
    ctx.log.info.text('Fetching activities for date ranges').dateRange(kmlOpts.date).emit();

    let activities: Api.Activity.Base[] = [];

    const athleteId: Api.Schema.AthleteId = (this.athlete && Api.isStravaId(this.athlete.id))
      ? this.athlete.id
      : 0;

    // Get activities for each date range
    for (const dateRange of kmlOpts.date!.ranges) {
      const opts: Api.ActivityOpts = {
        athleteId,
        query: {
          per_page: 200,
          after: Math.floor(
            (dateRange.after ? dateRange.after.getTime() : new Date(1975, 0, 1).getTime()) / 1000,
          ),
          before: Math.floor((dateRange.before ? dateRange.before.getTime() : new Date().getTime()) / 1000),
        },
      };

      const rangeActivitiesData = await this.api.getActivities(ctx, opts);

      // Convert Dict[] to Activity.Base[]
      for (const data of rangeActivitiesData) {
        const activity = new Api.Activity.Base(data as unknown as Api.Schema.SummaryActivity);
        activities.push(activity);
      }
    }

    if (activities.length) {
      ctx.log.info.text('Found').count(activities.length).text('activity', 'activities').emit();

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
        } catch (_e) {
          // const err = _.asError(_e);
          ctx.log.warn.text('Failed to fetch coordinates for activity').activity(activity).emit();
        }
      }

      // Fetch detailed activity data for lap information if --laps is enabled
      if (kmlOpts.laps) {
        ctx.log.info.text('Fetching detailed activity data for lap markers').emit();
        for (let i = 0; i < activities.length; i++) {
          // Only fetch if we don't already have lap data (DetailedActivity has laps array)
          if (!('laps' in activities[i].data)) {
            try {
              const detailedActivity = await this.api.getDetailedActivity(ctx, activities[i].data);
              // Replace summary activity with detailed activity data (includes laps)
              activities[i] = new Api.Activity.Base(detailedActivity);
            } catch (_e) {
              ctx.log.warn.text('Failed to fetch detailed data for').activity(activities[i]).emit();
            }
          }
        }
      }
    }
    return activities;
  }

  async getKmlSegments(ctx: Ctx.Context, opts: Kml.CommonOpts & Kml.SegmentOpts): Promise<Segment.Data[]> {
    const result: Segment.Data[] = await this.getSegments(ctx, {
      coordinates: true,
      efforts: false, // Don't fetch efforts for KML, just coordinates
      dateRanges: opts.date,
    });
    return result;
  }

  /**
   * Generates Adobe Acroforms XML file from Strava activities for bikelog PDF forms.
   *
   * This method orchestrates the complete XML generation workflow for bikelog PDF forms:
   * 1. Validates date ranges are specified
   * 2. Fetches activities for specified date ranges
   * 3. Fetches detailed activity data to access description and private_note fields
   * 4. Prepares bike dictionary from athlete profile
   * 5. Generates XML file with daily activity summaries
   *
   * The generated XML includes:
   * - Up to 2 bike ride events per day (distance, bike, elevation, time)
   * - Activity notes with parsed description and private_note
   * - Custom properties extracted from descriptions (key=value format)
   * - Weight data automatically extracted to dedicated field
   * - Non-bike activities (Run, Swim, etc.) in notes section
   *
   * @param ctx Application context with logging
   * @param pdfOpts PDF/XML generation options including:
   * @param pdfOpts.date Required date ranges for activity filtering
   * @param pdfOpts.output Output file path (defaults to 'bikelog.xml')
   *
   * @example
   * ```ts
   * await app.getPdf(ctx, {
   *   date: dateRanges,
   *   output: 'bikelog2024.xml'
   * });
   * ```
   */
  async getPdf(ctx: Ctx.Context, pdfOpts: BikeLog.Opts): Promise<void> {
    const activities: Api.Activity.Base[] = [];

    // Fetch activities if we have date ranges
    if (!(pdfOpts.date && pdfOpts.date.hasRanges())) {
      ctx.log.warn.warn('No date ranges specified').emit();
      return;
    }

    ctx.log.info.text('Generating PDF/XML for Adobe Acrobat Forms').emit();

    const m0 = ctx.log.mark();
    ctx.log.info.text('Fetching activities for date ranges').dateRange(pdfOpts.date).emit();

    // Get athlete ID (default to authenticated user)
    const athleteId = this.athlete?.id || 0;

    // Get activities for each date range
    for (const dateRange of pdfOpts.date.ranges) {
      const opts: Api.ActivityOpts = {
        athleteId,
        query: {
          per_page: 200,
          after: Math.floor(
            (dateRange.after ? dateRange.after.getTime() : new Date(1975, 0, 1).getTime()) / 1000,
          ),
          before: Math.floor((dateRange.before ? dateRange.before.getTime() : new Date().getTime()) / 1000),
        },
      };

      const rangeActivitiesData = await this.api.getActivities(ctx, opts);

      // Convert Dict[] to Activity.Base[]
      for (const data of rangeActivitiesData) {
        const activity = new Api.Activity.Base(data as unknown as Api.Schema.SummaryActivity);
        activities.push(activity);
      }
    }

    ctx.log.info.text('Found').count(activities.length).text('activity', 'activities').ewt(m0);

    // Fetch detailed activity data to get description and private_note fields
    if (activities.length > 0) {
      ctx.log.info.h2('Fetching detailed activity data for').count(activities.length).h2(
        'activity',
        'activities',
      ).emit();
      ctx.log.indent();
      for (let i = 0; i < activities.length; i++) {
        try {
          const detailedActivity = await this.api.getDetailedActivity(ctx, activities[i].data);
          // Replace summary activity with detailed activity data
          activities[i] = new Api.Activity.Base(detailedActivity);
          ctx.log.info.activity(activities[i]).emit();
        } catch (_e) {
          ctx.log.warn.text('Failed to fetch detailed data for').activity(activities[i]).emit();
        }
      }
      ctx.log.outdent();

      // Attach starred segment efforts to activities
      await this.attachStarredSegments(ctx, activities);
    }

    // Prepare bikes dict from athlete data
    const bikes: Record<string, Api.Schema.SummaryGear> = {};
    if (this.athlete && 'bikes' in this.athlete) {
      const athleteBikes = this.athlete.bikes;
      if (_.isArray(athleteBikes)) {
        athleteBikes.forEach((bike: Api.Schema.SummaryGear) => {
          if (bike && bike.id) {
            bikes[bike.id] = bike;
          }
        });
      }
    }

    // Create Bikelog instance with options
    const bikelogOpts: BikeLog.OutputOpts = {
      more: true, // pdfOpts.more,
      dates: pdfOpts.date,
      bikes,
    };

    const bikelog = new BikeLog.Bikelog(bikelogOpts);

    // Generate output file path
    const outputPath = typeof pdfOpts.output === 'string'
      ? pdfOpts.output
      : pdfOpts.output?.path
      ? pdfOpts.output.path
      : 'bikelog.xml';

    // if (pdfOpts.dryRun) {
    //   ctx.log.info.text(`Dry run: would generate XML file: ${outputPath}`).emit();
    //   ctx.log.info.text(`Would process ${activities.length} activities`).emit();
    //   return;
    // }

    ctx.log.info.text('Generating XML file').fs(outputPath).emit();
    await bikelog.outputData(ctx, outputPath, activities);
    ctx.log.info.h2('PDF/XML file generated successfully').fs(outputPath).emit();
  }

  /**
   * TODO: use some of this logic in the getAllStarredSegments, but for getAllStarredSegments we
   * optionally also get all the coordinates. we do NOT store the coordinates in the userSegments file.
   * @param ctx
   */
  async refreshStarredSegments(ctx: Ctx.Context) {
    const segFile = new Segment.File(new FS.File(configPaths.userSegments));
    await segFile.get(ctx, { refresh: true });
  }

  /**
   * TODO: Implement
   *
   * Retrieves effort information associated with starred segments, for an activity. This will be included
   * in PDF XML or a KML activity's 'more' data.
   *
   * How do we determine the starred segments that are in an activity? Our userSegments file lists
   * all of our starred segments.
   * @param ctx
   * @param activityId
   */
  async getEffortsForActivity(_ctx: Ctx.Context, _activityId: Api.Schema.ActivityId): Promise<void> {
    // To implement
  }

  /**
   * Retrieves ALL starred segments from cache with optional efforts and coordinates.
   *
   * **IMPORTANT**: This method returns ALL of the user's starred segments (from the
   * ~/.strava/user.segments.json cache), not just segments related to specific activities.
   * Use {@link attachStarredSegments} to filter and attach only starred segments that appear
   * in specific activities.
   *
   * **Cache Behavior**:
   * - **Metadata cached**: Segment ID, name, distance, country, state are cached locally
   * - **Coordinates NOT cached**: Coordinates are ALWAYS fetched fresh from Strava API when requested
   * - **Empty cache**: If cache is empty (first run), returns empty array. Run `segments --refresh`
   *   or use `opts.refresh=true` to populate the cache first
   * - **Cache updates**: Only `opts.refresh=true` updates the metadata cache from Strava API
   *
   * **Coordinates**: When `opts.coordinates` is true, fetches coordinates from Strava API
   * for ALL starred segments (requires separate API call per segment, subject to rate limits).
   * Coordinates are never cached - always fetched fresh.
   *
   * **Efforts**: When `opts.efforts` is true, fetches personal effort data for ALL
   * starred segments within the specified date ranges. Used for performance analysis.
   *
   * @param ctx Application context with logging
   * @param opts Segment fetch options:
   * @param [opts.coordinates=false] Fetch coordinates from Strava API for ALL starred segments
   * @param [opts.efforts=false] Fetch personal efforts for ALL starred segments
   * @param [opts.dateRanges] Date ranges to filter efforts (required if opts.efforts is true)
   * @param [opts.refresh=false] Refresh metadata cache from Strava API before loading
   * @returns Array of ALL starred segments with optional efforts and coordinates
   *
   * @example
   * ```ts
   * // First run - populate cache from Strava
   * await app.getSegments(ctx, { refresh: true });
   *
   * // Get all starred segments with coordinates for KML (fetches coords from API)
   * const segments = await app.getSegments(ctx, { coordinates: true });
   *
   * // Get all starred segments with effort data for analysis
   * const segments = await app.getSegments(ctx, {
   *   efforts: true,
   *   dateRanges: dateRanges
   * });
   * ```
   */
  async getSegments(
    ctx: Ctx.Context,
    opts: { efforts?: boolean; coordinates?: boolean; dateRanges?: DateRanges; refresh?: boolean } = {},
  ): Promise<Segment.Data[]> {
    const m0 = ctx.log.mark();

    // Load or refresh segment cache
    const segFile = new Segment.File(new FS.File(configPaths.userSegments));
    await segFile.get(ctx, { refresh: opts.refresh });

    // Get all cached segments
    const cachedSegments = segFile.getAllSegments();
    ctx.log.info.text('Loaded').count(cachedSegments.length).text('starred segment', 'starred segments')
      .text('from cache').ewt(m0);

    // Convert CacheEntry objects to SegmentData
    const segments: Segment.Data[] = [];
    for (const cached of cachedSegments) {
      if (!cached.id || !cached.name) {
        continue; // Skip invalid entries
      }

      // Create SegmentData from cached entry
      const segmentBase = new Segment.Base({
        id: cached.id,
        name: cached.name,
        distance: cached.distance || 0,
      });

      const segment = new Segment.Data(segmentBase);
      segment.id = cached.id;
      segment.name = cached.name;
      segment.elapsedTime = 0;
      segment.movingTime = 0;
      segment.distance = cached.distance || 0;
      segment.country = cached.country || '';
      segment.state = cached.state || '';
      segment.coordinates = []; // Never load coordinates from cache - fetch on demand only

      segments.push(segment);
    }

    // Fetch coordinates if requested and needed
    if (opts.coordinates && segments.length > 0) {
      // Find segments that need coordinates (not cached)
      const segmentsNeedingCoords = segments.filter((seg) =>
        !seg.coordinates || seg.coordinates.length === 0
      );

      if (segmentsNeedingCoords.length > 0) {
        ctx.log.info.text('Fetching coordinates for').count(segmentsNeedingCoords.length).text(
          'segment',
          'segments',
        )
          .emit();

        let rateLimitHit = false;
        for (const segment of segmentsNeedingCoords) {
          if (rateLimitHit) {
            break; // Stop fetching if we hit rate limit
          }

          try {
            const coords = await this.api.getStreamCoords(
              ctx,
              'segments' as Api.Schema.StreamKeyType,
              segment.id,
              segment.name,
            );
            if (coords && coords.length > 0) {
              segment.coordinates = coords;
              // Update cache with fetched coordinates
              // segFile.updateCoordinates(segment.id, coords);
            }
          } catch (e) {
            const err = _.asError(e);
            // Check for rate limit (429) error
            if (err.message.includes('429')) {
              ctx.log.warn.text(
                'Rate limit hit. Stopping coordinate fetch. Use cached coordinates for remaining segments.',
              )
                .emit();
              rateLimitHit = true;
            }
            // For other errors (404, etc.), just continue silently
          }
        }
      } else {
        ctx.log.info.text('All segments already have coordinates').emit();
      }
    }

    // Fetch efforts if requested
    if (opts.efforts && opts.dateRanges && segments.length > 0) {
      ctx.log.info.text('Fetching segment efforts for date ranges').emit();
      if (!this.athlete?.id) {
        throw new Error('Athlete ID is required to fetch segment efforts');
      }
      const athleteId = this.athlete.id;

      for (const segment of segments) {
        const allEfforts: Api.Schema.DetailedSegmentEffort[] = [];

        // Get efforts for each date range
        for (const dateRange of opts.dateRanges.ranges) {
          try {
            const params: Api.Query = {
              athlete_id: athleteId,
              per_page: 200,
              start_date_local: (dateRange.after || new Date(1975, 0, 1)).toISOString(),
              end_date_local: (dateRange.before || new Date()).toISOString(),
            };

            const efforts = await this.api.getSegmentEfforts(ctx, segment.id, params);
            if (_.isArray(efforts) && efforts.length > 0) {
              allEfforts.push(...efforts);
            }
          } catch (_e) {
            ctx.log.warn.text('Failed to fetch efforts for segment').value(segment.name).emit();
          }
        }

        if (allEfforts.length > 0) {
          // Sort by elapsed time
          allEfforts.sort((a, b) => {
            const aTime = a.elapsed_time || 0;
            const bTime = b.elapsed_time || 0;
            return aTime - bTime;
          });
          ctx.log.info.text('Found').count(allEfforts.length).text('effort', 'efforts').text('for')
            .value(segment.name).emit();
          // Store efforts on segment
          segment.efforts = allEfforts;
        }
      }
    }

    return segments;
  }

  /**
   * Attaches starred segment efforts to activities.
   *
   * This method fetches the list of starred segments from cache, applies any configured
   * name aliases, and filters each activity's segment_efforts to include only those that
   * match starred segments. The filtered segment efforts are attached to each activity's
   * `segments` property for use in KML/PDF output.
   *
   * After calling this method, callers can access the attached segment efforts via
   * `activity.segments`, which contains an array of {@link Api.Activity.SegmentData} objects
   * with the aliased segment names already applied.
   *
   * @param ctx Application context for logging
   * @param activities Array of activities to process
   *
   * @example
   * ```ts
   * await app.attachStarredSegments(ctx, activities);
   *
   * // Access the attached starred segment efforts
   * for (const activity of activities) {
   *   if (activity.segments.length > 0) {
   *     console.log(`Activity ${activity.name} has ${activity.segments.length} starred segments`);
   *     for (const segment of activity.segments) {
   *       console.log(`  - ${segment.name}: ${segment.elapsed_time}s`);
   *     }
   *   }
   * }
   * ```
   */
  async attachStarredSegments(
    ctx: Ctx.Context,
    activities: Api.Activity.Base[],
  ): Promise<void> {
    if (!activities.length) {
      return;
    }

    // Load a list of starred segments from cache (populated by `segments --refresh` command)
    const segFile = new Segment.File(new FS.File(configPaths.userSegments));
    await segFile.get(ctx, { refresh: false }); // Use cache, don't refresh
    const cachedSegments = segFile.segments;

    if (cachedSegments.size === 0) {
      ctx.log.info.text('No starred segments found in cache. Run `segments --refresh` to populate cache.')
        .emit();
      return;
    }

    // Build a map of segmentId -> (aliased) segmentName
    type StarredSegmentDict = Record<Api.Schema.SegmentId, string>;
    const starredSegments = Array.from(cachedSegments.entries()).reduce((acc, [id, seg]) => {
      if (seg.name) {
        let segmentName = seg.name.trim();
        // Apply segment name alias from user settings if available
        if (this.userSettings?.aliases) {
          // Try direct lookup first
          if (segmentName in this.userSettings.aliases) {
            segmentName = this.userSettings.aliases[segmentName];
          } else {
            // Try case-insensitive lookup
            const lowerName = segmentName.toLowerCase();
            const aliasKey = Object.keys(this.userSettings.aliases).find(
              (key) => key.toLowerCase() === lowerName,
            );
            if (aliasKey) {
              segmentName = this.userSettings.aliases[aliasKey];
            }
          }
        }
        acc[id] = segmentName;
      }
      return acc;
    }, {} as StarredSegmentDict);

    ctx.log.info.text('Processing segment efforts for').count(activities.length).text(
      'activity',
      'activities',
    )
      .emit();

    // Call each activity's attachStarredSegments method
    for (const activity of activities) {
      const count = activity.attachStarredSegments(starredSegments);
      if (count > 0) {
        ctx.log.info.text('Found').count(count)
          .text('starred segment effort').text('for').activity(activity).emit();
      }
    }
  }
}
