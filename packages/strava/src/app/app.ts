import type { DateRanges } from '@epdoc/daterange';
import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import { assert } from '@std/assert/assert';
import * as BikeLog from '../bikelog/mod.ts';
import rawConfig from '../config.json' with { type: 'json' };
import type * as Ctx from '../context.ts';
import { type Activity, Api, type StravaApi } from '../dep.ts';
import * as Segment from '../segment/mod.ts';
import { KmlWriter } from '../stream/kml.ts';
import * as Stream from '../stream/mod.ts';
import type * as App from './types.ts';

const rawHome = Deno.env.get('HOME');
assert(rawHome, 'Environment variable HOME is missing');
const home: string = rawHome;
assert(
  _.isDict(rawConfig) && 'paths' in rawConfig && _.isDict(rawConfig.paths),
  'Invalid application configuration',
);
const lessRaw = _.deepCopy(rawConfig, {
  replace: { 'HOME': home },
  pre: '${',
  post: '}',
}) as App.ConfigFile;
const configPaths = lessRaw.paths;

type GetActivitiesOpts = {
  detailed?: boolean;
  streams?: Api.Schema.StreamType[];
  coordinates?: boolean;
  starredSegments?: boolean;
  filter?: Api.ActivityFilter;
  dedup?: boolean;
  blackoutZones?: Api.LatLngRect[];
};

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
  #api: StravaApi;
  athlete?: Api.Schema.DetailedAthlete;
  userSettings?: App.UserSettings;
  notifyOffline = false;

  constructor() {
    // Initialize with defaults
    this.#api = new Api.Api(configPaths.userCreds, [{ path: configPaths.clientCreds }, {
      env: true,
    }]);
  }

  /**
   * Gets the initialized Strava API client instance.
   *
   * @returns The API client configured with user credentials
   * @throws Error if API not initialized (should not happen in normal usage)
   */
  get api(): StravaApi {
    if (!this.#api) {
      throw new Error('API not initialized. Call initClient() first.');
    }
    return this.#api;
  }

  /**
   * Initializes application services based on specified options.
   *
   * This method selectively initializes only the services needed for a given
   * operation, avoiding unnecessary initialization overhead. Services are
   * initialized in order:
   *
   * 1. Configuration files (if `opts.config` is true).
   * 2. Strava API with OAuth authentication (if `opts.strava` is true).
   * 3. User settings from `~/.strava/user.settings.json` (if `opts.userSettings` is true).
   *
   * @param ctx - Application context with logging.
   * @param [opts={}] - Initialization options.
   * @param [opts.config] - When true, initializes configuration files.
   * @param [opts.strava] - When true, initializes the Strava API client with authentication.
   * @param [opts.userSettings] - When true, loads user settings (e.g. line styles, bikes).
   *
   * @example
   * ```ts
   * // Initialize only what's needed for an athlete command
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
      const rawSettings = await new FS.File(configPaths.userSettings).readJson();
      this.userSettings = _.deepCopy(rawSettings, {
        replace: { 'HOME': home },
        pre: '${',
        post: '}',
      }) as App.UserSettings;
    }
  }

  /**
   * Checks if internet access is available.
   *
   * @param _ctx - Application context (currently unused).
   * @returns A promise that resolves to `true` if online, `false` otherwise.
   * @todo Implement a more robust internet connectivity check.
   */
  checkInternetAccess(_ctx: Ctx.Context): Promise<boolean> {
    // Simple internet check - for now just return true
    // TODO: Implement actual internet connectivity check
    return Promise.resolve(true);
  }

  /**
   * Sets the athlete ID for API calls.
   *
   * @param _id - The athlete ID to set.
   * @todo Implement athlete ID storage and usage.
   */
  setAthleteId(_id: Api.Schema.AthleteId): Promise<void> {
    // TODO: Implement athlete ID storage and usage
    return Promise.resolve();
  }

  /**
   * Retrieves athlete profile information from the Strava API.
   *
   * Fetches the authenticated athlete's profile (or a specific athlete if an ID
   * is provided) and stores it in the `athlete` property. The profile includes:
   *
   * - Name and location (city, state, country)
   * - Athlete ID
   * - A list of the athlete's bikes and shoes
   *
   * @param ctx - Application context for logging.
   * @param [athleteId] - Optional. The ID of a specific athlete. Defaults to the
   * authenticated user.
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
      assert(this.athlete, 'Athlete not defined');
      ctx.log.info.h2(`Retrieved athlete: ${this.athlete.firstname} ${this.athlete.lastname}`)
        .emit();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      ctx.log.error.error(`Failed to get athlete: ${errorMsg}`).emit();
      throw err;
    }
  }

  /**
   * Fetches activities for a given set of date ranges.
   *
   * This method retrieves activities from the Strava API within one or more
   * specified date ranges. It can optionally fetch detailed information,
   * coordinates, and attach starred segment data to the activities.
   *
   * @param ctx - The application context for logging.
   * @param date - The date ranges to fetch activities for.
   * @param [opts={}] - Options for fetching activities.
   * @param [opts.detailed=false] - Whether to fetch detailed information for each activity.
   * @param [opts.coordinates=false] - Whether to fetch coordinates for each activity.
   * @param [opts.starredSegments=false] - Whether to attach starred segment information to each activity.
   * @param [opts.filter] - A filter to apply to the activities.
   * @returns A promise that resolves to an array of activities.
   */
  async getActivitiesForDateRange(
    ctx: Ctx.Context,
    date: DateRanges,
    opts: GetActivitiesOpts = {},
  ): Promise<Activity[]> {
    let activities: Activity[] = [];

    const m0 = ctx.log.mark();
    ctx.log.info.h2('Fetching activities for date ranges').dateRange(date).emit();

    const athleteId: Api.Schema.AthleteId = (this.athlete && Api.isStravaId(this.athlete.id))
      ? this.athlete.id
      : 0;

    // Get activities for each date range
    for (const dateRange of date.ranges) {
      const opts: Api.ActivityOpts = {
        athleteId,
        query: {
          per_page: 200,
          after: Math.floor(
            (dateRange.after ? dateRange.after.getTime() : new Date(1975, 0, 1).getTime()) / 1000,
          ),
          before: Math.floor(
            (dateRange.before ? dateRange.before.getTime() : new Date().getTime()) / 1000,
          ),
        },
      };

      activities = [...activities, ...await this.api.getActivities(ctx, opts)];
    }
    if (opts.filter) {
      activities = activities.filter((activity) => activity.include(opts.filter!));
    }

    ctx.log.info.text('Found').count(activities.length).text('activity', 'activities').ewt(m0);

    if (activities.length) {
      if (opts.detailed || opts.starredSegments) {
        const jobs: Promise<void>[] = [];
        activities.forEach((activity) => {
          jobs.push(activity.getDetailed(ctx));
        });
        await Promise.all(jobs);
      }
      if (_.isNonEmptyArray(opts.streams)) {
        ctx.log.info.text('Fetching coordinates for activities').emit();
        const jobs: Promise<void>[] = [];
        const streams = opts.streams; // Extract to non-null variable
        activities.forEach((activity) => {
          jobs.push(activity.getCoordinates(ctx, streams));
        });
        await Promise.all(jobs);
        activities.forEach((activity) => {
          activity.filterCoordinates(ctx, opts.dedup === true, opts.blackoutZones);
        });
      }

      if (opts.starredSegments) {
        const starredSegmentDict = await this.getStarredSegmentDict(ctx);
        ctx.log.info.text('Processing segment efforts for').count(activities.length)
          .text('activity', 'activities').emit();
        activities.forEach((activity) => {
          const count = activity.attachStarredSegments(starredSegmentDict);
          if (count > 0) {
            ctx.log.info.text('Found').count(count)
              .text('starred segment effort').text('for').activity(activity).emit();
          }
        });
      }
    }
    return activities;
  }

  /**
   * Generates a KML file from Strava activities or segments for Google Earth.
   *
   * This method orchestrates the complete KML generation workflow:
   * 1. Initializes a KML generator with user-configured line styles.
   * 2. Validates that activities or segments are requested.
   * 3. Fetches activities for the specified date ranges, applying filters.
   * 4. Optionally fetches detailed activity data for lap markers (if `kmlOpts.laps` is true).
   * 5. Fetches coordinates for each activity from Strava streams.
   * 6. Applies commute filtering based on `kmlOpts.commute`.
   * 7. Generates a KML file with appropriate styling and organization.
   *
   * The generated KML can include:
   * - Activity routes as color-coded `LineString` elements.
   * - Optional lap markers as `Point` placemarks.
   * - Segment routes organized by region.
   *
   * @param ctx - Application context for logging.
   * @param streamOpts - KML generation options.
   * @param [kmlOpts.activities=false] - Whether to include activity paths in the KML.
   * @param [kmlOpts.date] - Date ranges for filtering activities. Required if `kmlOpts.activities` is true.
   * @param [kmlOpts.output='Activities.kml'] - The path for the output file.
   * @param [kmlOpts.laps=false] - Whether to include lap markers.
   * @param [kmlOpts.commute='all'] - Commute filter ('yes', 'no', or 'all').
   * @param [kmlOpts.more=false] - Whether to include detailed descriptions.
   * @param [kmlOpts.efforts=false] - Whether to include effort data.
   * @param [kmlOpts.imperial=false] - Whether to use imperial units.
   * @throws If neither `kmlOpts.activities` nor `kmlOpts.segments` is true.
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
  async getKml(ctx: Ctx.Context, streamOpts: Stream.Opts): Promise<void> {
    // Validate that at least activities or segments is requested
    if (!streamOpts.activities && !streamOpts.segments) {
      throw new Error('When writing KML, select either segments, activities, or both');
    }

    // Initialize stream generator with options and line styles
    const handler = new Stream.Handler(streamOpts);
    assert(streamOpts.output, 'Output path is required for stream generation');
    const writer = await handler.initWriter(ctx, streamOpts.output);

    assert(writer, 'No stream writer could be generated for the given output path');

    if (writer instanceof KmlWriter && this.userSettings && this.userSettings.lineStyles) {
      writer.setLineStyles(ctx, this.userSettings.lineStyles);
    }

    let activities: Activity[] = [];
    let segments: Segment.Data[] = [];

    if (streamOpts.activities) {
      assert(streamOpts.date);

      const opts: GetActivitiesOpts = {
        detailed: streamOpts.laps || streamOpts.more || streamOpts.efforts,
        streams: writer?.streamTypes(),
        starredSegments: streamOpts.efforts,
        dedup: (streamOpts.allowDups === true) ? false : true,
      };
      // Filter activities based on commute option
      if (streamOpts.commute === 'yes') {
        opts.filter = { commuteOnly: true };
      } else if (streamOpts.commute === 'no') {
        opts.filter = { nonCommuteOnly: true };
      }
      if (streamOpts.blackout) {
        assert(ctx.app.userSettings, 'User settings have not been read');
        opts.blackoutZones = ctx.app.userSettings.blackoutZones;
      }

      activities = await this.getActivitiesForDateRange(ctx, streamOpts.date!, opts);
    }

    // Fetch segments because we are building a KML of all our segments
    if (streamOpts.segments) {
      segments = await this.getKmlSegments(ctx, streamOpts);
    }

    if (activities.length || segments.length) { // Generate KML or GPX files
      // We already asserted output is not undefined earlier
      const outputPath = streamOpts.output;

      await handler.outputData(ctx, outputPath, activities, segments);
    } else {
      ctx.log.info.warn('No activities or segments found for the specified criteria').emit();
    }
  }

  /**
   * Retrieves segments suitable for KML generation.
   *
   * This method fetches starred segments, including their coordinates, but
   * without effort data, which is not needed for KML visualization.
   *
   * @param ctx - Application context for logging.
   * @param opts - Options for fetching KML segments, including date ranges.
   * @returns A promise that resolves to an array of segment data.
   */
  async getKmlSegments(
    ctx: Ctx.Context,
    opts: Stream.CommonOpts & Stream.StreamSegmentOpts,
  ): Promise<Segment.Data[]> {
    const result: Segment.Data[] = await this.getSegments(ctx, {
      coordinates: true,
      efforts: false, // Don't fetch efforts for KML, just coordinates
      dateRanges: opts.date,
    });
    return result;
  }

  /**
   * Generates an Adobe Acroforms XML file for bikelog PDF forms.
   *
   * This method orchestrates the XML generation for bikelog PDFs:
   * 1. Validates that date ranges are specified.
   * 2. Fetches activities within the given date ranges.
   * 3. Fetches detailed data for each activity to access descriptions and private notes.
   * 4. Prepares a dictionary of the athlete's bikes from their profile.
   * 5. Generates an XML file containing daily activity summaries.
   *
   * The generated XML can include:
   * - Up to two bike ride events per day (distance, bike, elevation, time).
   * - Activity notes parsed from descriptions and private notes.
   * - Custom properties and weight data extracted from descriptions.
   * - Non-bike activities (e.g., runs, swims) in the notes section.
   *
   * @param ctx - Application context for logging.
   * @param pdfOpts - PDF/XML generation options.
   * @param pdfOpts.date - The date ranges for activity filtering.
   * @param [pdfOpts.output='bikelog.xml'] - The path for the output file.
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
    // Fetch activities if we have date ranges
    if (!(pdfOpts.date && pdfOpts.date.hasRanges())) {
      ctx.log.warn.warn('No date ranges specified').emit();
      return;
    }

    ctx.log.info.text('Generating PDF/XML for Adobe Acrobat Forms').emit();

    const opts: GetActivitiesOpts = {
      detailed: true,
      starredSegments: true,
    };

    const activities: Activity[] = await this.getActivitiesForDateRange(ctx, pdfOpts.date, opts);

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
   * Refreshes the cache of the user's starred segments.
   *
   * This method forces an update of the local cache of starred segments by
   * fetching the latest data from the Strava API.
   *
   * @param ctx - Application context for logging.
   */
  async refreshStarredSegments(ctx: Ctx.Context) {
    const segFile = new Segment.File(new FS.File(configPaths.userSegments));
    await segFile.get(ctx, { refresh: true });
  }

  /**
   * Retrieves all starred segments from the cache, with optional efforts and coordinates.
   *
   * @remarks
   * This method returns all of the user's starred segments from the local
   * cache (`~/.strava/user.segments.json`), not just segments related to
   * specific activities. To filter and attach only the starred segments that
   * appear in specific activities, use {@link Main.getStarredSegmentDict} and
   * {@link Api.Activity.attachStarredSegments}.
   *
   * **Cache Behavior**:
   * - Segment metadata (ID, name, distance, country, state) is cached locally.
   * - Coordinates are **never** cached and are always fetched from the Strava
   *   API when requested.
   * - If the cache is empty, this method returns an empty array. The cache can
   *   be populated by running the `segments --refresh` command or by setting
   *   `opts.refresh` to `true`.
   * - The cache is only updated from the Strava API if `opts.refresh` is `true`.
   *
   * **Coordinates**:
   * When `opts.coordinates` is `true`, coordinates are fetched from the Strava
   * API for all starred segments. This may require a separate API call for each
   * segment and is subject to rate limits.
   *
   * **Efforts**:
   * When `opts.efforts` is `true`, personal effort data is fetched for all
   * starred segments within the specified date ranges.
   *
   * @param ctx - Application context for logging.
   * @param [opts={}] - Segment fetch options.
   * @param [opts.coordinates=false] - If true, fetches coordinates for all starred segments.
   * @param [opts.efforts=false] - If true, fetches personal efforts for all starred segments.
   * @param [opts.dateRanges] - Date ranges to filter efforts. Required if `opts.efforts` is true.
   * @param [opts.refresh=false] - If true, refreshes the metadata cache from the Strava API.
   * @returns A promise that resolves to an array of all starred segments, with
   * optional efforts and coordinates.
   *
   * @example
   * ```ts
   * // First run - populate the cache from Strava
   * await app.getSegments(ctx, { refresh: true });
   *
   * // Get all starred segments with coordinates for KML
   * const segmentsWithCoords = await app.getSegments(ctx, { coordinates: true });
   *
   * // Get all starred segments with effort data for analysis
   * const segmentsWithEfforts = await app.getSegments(ctx, {
   *   efforts: true,
   *   dateRanges: dateRanges
   * });
   * ```
   */
  async getSegments(
    ctx: Ctx.Context,
    opts: { efforts?: boolean; coordinates?: boolean; dateRanges?: DateRanges; refresh?: boolean } =
      {},
  ): Promise<Segment.Data[]> {
    const m0 = ctx.log.mark();

    // Load or refresh segment cache
    const segFile = new Segment.File(new FS.File(configPaths.userSegments));
    await segFile.get(ctx, { refresh: opts.refresh });

    // Get all cached segments
    const cachedSegments = segFile.getAllSegments();
    ctx.log.info.text('Loaded').count(cachedSegments.length).text(
      'starred segment',
      'starred segments',
    )
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
              'segments',
              [Api.Schema.StreamKeys.LatLng, Api.Schema.StreamKeys.Altitude],
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

  async getCachedSegments(ctx: Ctx.Context): Promise<Segment.CacheMap> {
    const segFile = new Segment.File(new FS.File(configPaths.userSegments));
    await segFile.get(ctx, { refresh: false }); // Use cache, don't refresh
    return segFile.segments;
  }

  /**
   * Retrieves a dictionary of starred segments from the cache.
   *
   * This method fetches the list of starred segments from the cache, applies any
   * configured name aliases, and returns a dictionary mapping segment IDs to
   * their names. This dictionary is used to efficiently identify starred
   * segments in activities.
   *
   * @param ctx - Application context for logging.
   * @returns A promise that resolves to a dictionary of starred segments, where
   * the keys are segment IDs and the values are the segment names.
   *
   * @example
   * ```ts
   * const starredSegments = await app.getStarredSegmentDict(ctx);
   * for (const activity of activities) {
   *   activity.attachStarredSegments(starredSegments);
   * }
   * ```
   */
  async getStarredSegmentDict(
    ctx: Ctx.Context,
  ): Promise<Api.StarredSegmentDict> {
    // Load a list of starred segments from cache (populated by `segments --refresh` command)

    const cachedSegments = await this.getCachedSegments(ctx);

    if (cachedSegments.size === 0) {
      ctx.log.info.text(
        'No starred segments found in cache. Run `segments --refresh` to populate cache.',
      )
        .emit();
      return {};
    }

    // Build a map of segmentId -> (aliased) segmentName
    const starredSegments: Api.StarredSegmentDict = Array.from(cachedSegments.entries()).reduce(
      (acc, [id, seg]) => {
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
      },
      {} as Api.StarredSegmentDict,
    );
    return starredSegments;
  }
}
