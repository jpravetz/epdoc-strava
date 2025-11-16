import type { IANATZ, ISODate } from '@epdoc/datetime';
import { DateEx } from '@epdoc/datetime'; // Import DateEx
import type { EpochMilliseconds, Seconds } from '@epdoc/duration';
import { _, type CompareResult, type Dict, type Integer } from '@epdoc/type';
import { assert } from '@std/assert';
import type { Api } from './api.ts';
import type * as Ctx from './context.ts';
import type * as Schema from './schema/mod.ts';
import type {
  ActivityFilter,
  Kilometres,
  LatLngRect,
  Metres,
  SegmentData,
  SegmentEffort,
  StarredSegmentDict,
  TrackPoint,
} from './types.ts';

const REGEX = {
  noKmlData: /^(Workout|Yoga|Weight Training)$/i,
};

/**
 * Represents a Strava activity.
 *
 * This class encapsulates the data for a Strava activity and provides convenient methods for accessing and manipulating
 * that data.
 */
export class Activity<M extends Ctx.MsgBuilder, L extends Ctx.Logger<M>> {
  public Context!: Ctx.IContext<M, L>;
  public data: Schema.SummaryActivity | Schema.DetailedActivity;
  api?: Api<M, L>;
  #detailed = false;
  #trackPoints: TrackPoint[] = []; // will contain the latlng coordinates for the activity
  #segments: SegmentData[] = []; // Will be declared here
  #aliases?: Record<string, string>; // Private property for aliases
  #segmentProvider?: { getSegment(name: string): Schema.SummarySegment | undefined }; // Private property for segment provider

  /**
   * Constructs a new `Activity` instance.
   *
   * @param data The raw activity data from the Strava API. This can be either a summary or a detailed representation.
   * @param opts Options for the activity.
   * @param opts.aliases A map of segment name aliases.
   * @param opts.segmentProvider A provider for retrieving segment data.
   */
  constructor(
    data: Schema.SummaryActivity | Schema.DetailedActivity,
    opts?: {
      aliases?: Record<string, string>;
      segmentProvider?: { getSegment(name: string): Schema.SummarySegment | undefined };
    },
  ) {
    this.data = data;
    this.#aliases = opts?.aliases;
    this.#segmentProvider = opts?.segmentProvider;
  }

  /**
   * Updates the activity data with new information.
   *
   * This is useful when you have a summary activity and want to update it with detailed information.
   *
   * @param data The new activity data.
   */
  update(data: Schema.SummaryActivity | Schema.DetailedActivity) {
    this.data = data;
  }

  /**
   * The start date of the activity as a `Date` object.
   */
  get startDateAsDate(): Date {
    return new Date(this.data.start_date);
  }

  /**
   * Returns a string representation of the activity, including the date, type, distance, and name.
   */
  public toString(): string {
    const d = Math.round(this.data.distance / 100) / 10;
    return `${this.startDateLocal}, ${this.type} ${d} km, ${this.name}`;
  }

  /**
   * The geographical coordinates of the activity with optional altitude and time data.
   */
  public get coordinates(): TrackPoint[] {
    return this.#trackPoints;
  }

  public set coordinates(val: TrackPoint[]) {
    this.#trackPoints = val;
  }

  /**
   * The name of the activity.
   */
  public get name(): string {
    return this.data.name;
  }

  /**
   * The unique identifier of the activity.
   */
  public get id(): Schema.ActivityId {
    return this.data.id;
  }

  /**
   * The moving time of the activity in seconds.
   */
  public get movingTime(): Seconds {
    return this.data.moving_time;
  }

  /**
   * The elapsed time of the activity in seconds.
   */
  public get elapsedTime(): Seconds {
    return this.data.elapsed_time;
  }

  /**
   * The distance of the activity in meters.
   */
  public get distance(): Metres {
    return this.data.distance;
  }

  /**
   * The distance of the activity in kilometers, rounded to two decimal places.
   */
  public distanceRoundedKm(): Kilometres {
    return Math.round(this.data.distance / 10) / 100;
  }

  /**
   * The total elevation gain of the activity in meters.
   */
  public get totalElevationGain(): Metres {
    return this.data.total_elevation_gain;
  }

  /**
   * The average temperature of the activity in degrees Celsius.
   */
  public get averageTemp(): number {
    return this.data.average_temp;
  }

  /**
   * The name of the device used to record the activity.
   */
  public get deviceName(): string {
    return this.data.device_name;
  }

  /**
   * Indicates if the activity was marked as a commute.
   */
  get commute(): boolean {
    return this.data.commute;
  }

  /**
   * The ID of the gear used for the activity.
   */
  get gearId(): string {
    return this.data.gear_id;
  }

  /**
   * The start datetime of the activity in the local timezone, in ISO 8601 format.
   */
  get startDatetimeLocal(): ISODate {
    return this.data.start_date_local;
  }

  /**
   * The start date in the local timezone in YYYY-MM-DD format.
   */
  get startDateLocal(): string {
    return this.data.start_date_local.split('T')[0];
  }

  /**
   * Creates a timezone-aware DateEx object for a specific time during the activity.
   *
   * Converts a time offset (in seconds from activity start) to a DateEx object with the
   * activity's local timezone. Used for generating timezone-aware timestamps in GPX/KML output.
   *
   * @param [delta=0] - Time offset in seconds from activity start (e.g., from stream time data)
   * @returns DateEx object set to the activity's timezone
   *
   * @example
   * ```ts
   * // Get DateEx for activity start
   * const startTime = activity.startDateEx();
   * console.log(startTime.toISOLocalString()); // "2025-11-14T09:53:35.000-06:00"
   *
   * // Get DateEx for a point 3600 seconds into the activity
   * const pointTime = activity.startDateEx(3600);
   * console.log(pointTime.toISOLocalString()); // "2025-11-14T10:53:35.000-06:00"
   * ```
   */
  startDateEx(delta: Seconds = 0): DateEx {
    const ms: EpochMilliseconds = new Date(this.data.start_date).getTime() + delta * 1000;
    const dateEx = new DateEx(ms);
    if (this.data.timezone) {
      const tzMatch = this.data.timezone.match(/\)\s*(.+)$/);
      if (tzMatch) {
        const tz = tzMatch[1];
        dateEx.tz(tz as IANATZ);
      }
    }
    return dateEx;
  }

  /**
   * The segment efforts associated with the activity.
   */
  get segments(): SegmentData[] { // Updated type to SegmentData[]
    return this.#segments; // Use private property
  }

  /**
   * Sets the segment efforts for the activity.
   * @param segments Array of segment effort data
   */
  set segments(segments: SegmentData[]) {
    this.#segments = segments;
  }

  /**
   * The type of the activity (e.g., 'Ride', 'Run').
   */
  get type(): string {
    return this.data.type;
  }

  /**
   * Checks if the activity is a ride or an e-bike ride.
   */
  isRide(): boolean {
    return this.data.type === 'Ride' || this.data.type === 'EBikeRide';
  }

  /**
   * Checks if the activity has track points.
   *
   * Some activity types, such as workouts, yoga, and weight training, do not have KML data.
   */
  hasTrackPoints(): boolean {
    if (!_.isString(this.type) || REGEX.noKmlData.test(this.type)) {
      return false;
    }
    return this.#trackPoints.length > 0 ? true : false;
  }

  /**
   * Checks if the activity has way points.
   */
  hasWaypoints(): boolean {
    if (!_.isString(this.type) || REGEX.noKmlData.test(this.type)) {
      return false;
    }
    return ('laps' in this.data && _.isArray(this.data.laps) && this.data.laps.length > 1)
      ? true
      : false;
  }

  /**
   * Extracts custom properties from the activity description.
   *
   * Custom properties are key-value pairs embedded in the activity description, with each pair on a new line in the
   * format `key=value`. Any lines that do not match this format are considered part of the description.
   *
   * @returns A dictionary of custom properties.
   */
  getCustomProperties(): Dict {
    const result: Dict = {};
    if ('description' in this.data && _.isString(this.data.description)) {
      const p: string[] = this.data.description.split(/\r?\n/);
      // console.log(p)
      if (p && p.length) {
        const a: string[] = [];
        p.forEach((line) => {
          const match = line.match(/^([^\s\=]+)\s*=\s*(.*)+$/);
          if (match) {
            const [, key, value] = match;
            result[key] = value;
          } else {
            a.push(line);
          }
        });
        if (a.length) {
          result.description = a.join('\n');
        }
      }
    }
    return result;
  }

  /**
   * Returns the segment efforts for the activity.
   *
   * @returns An array of segment efforts.
   */
  getSegments(): SegmentEffort[] { // Updated type to SegmentEffort[]
    const result: SegmentEffort[] = [];
    // TODO: Implement logic to process segment_efforts if needed.
    // The previous loop was empty and did not populate 'result'.
    return result;
  }

  // /** Do not delete */
  // private _addDetailSegmentsFromDetailedActivity(data: Schema.DetailedActivity) { // Updated type to Schema.DetailedActivity
  //   this.#segments = []; // Use private property
  //   data.segment_efforts.forEach((effort: Schema.DetailedSegmentEffort) => { // Explicitly typed effort
  //     if (this.#segmentProvider) { // Use injected segmentProvider
  //       const seg = this.#segmentProvider.getSegment(effort.name); // Use injected segmentProvider
  //       if (seg) {
  //         console.log('  Found starred segment', effort.name);
  //         this._addDetailSegment(effort);
  //       }
  //     }
  //   });
  // }

  /**
   * Fetches coordinate stream data from the Strava API for this activity.
   *
   * Retrieves one or more stream types (lat/lng, altitude, time, etc.) from Strava and
   * combines them into TrackPoint objects. The returned data populates the activity's
   * coordinates array for use in GPX/KML generation.
   *
   * @param ctx - Application context with logging
   * @param streamTypes - Array of stream types to fetch (e.g., LatLng, Altitude, Time)
   *
   * @example
   * ```ts
   * // Fetch coordinates with altitude and time for GPX export
   * await activity.getCoordinates(ctx, [
   *   Api.Schema.StreamKeys.LatLng,
   *   Api.Schema.StreamKeys.Altitude,
   *   Api.Schema.StreamKeys.Time
   * ]);
   *
   * // Access the populated coordinates
   * console.log(activity.coordinates.length); // e.g., 3822
   * console.log(activity.coordinates[0]); // { lat: 9.108, lng: -83.647, altitude: 124.8, time: 0 }
   * ```
   */
  async getTrackPoints(ctx: this['Context'], streamTypes: Schema.StreamType[]): Promise<void> {
    assert(this.api, 'api not set');
    try {
      const m0 = ctx.log.mark();
      const coords = await this.api.getStreamCoords(
        ctx,
        'activities',
        streamTypes,
        this.data.id,
        this.data.name,
      );
      if (coords && coords.length > 0) {
        this.#trackPoints = coords;
        ctx.log.info.h2('Retrieved').count(coords.length)
          .h2('track point').h2('for').value(this.toString()).ewt(m0);
      }
    } catch (_e) {
      // const err = _.asError(_e);
      ctx.log.warn.text('Failed to fetch coordinates for activity').value(this.name).emit();
    }
  }

  /**
   * Filters the activity's coordinates to remove blackout zones and duplicate points.
   *
   * Performs two filtering operations:
   * 1. **Blackout zones**: Removes any coordinates that fall within specified rectangular regions
   * 2. **Deduplication**: Removes intermediate points where consecutive coordinates have identical lat/lng
   *
   * The filtering is done in-place, modifying the activity's coordinates array. Original array
   * indices (e.g., from lap.start_index) become invalid after filtering.
   *
   * @param ctx - Application context with logging
   * @param dedup - Whether to remove intermediate duplicate coordinates
   * @param [blackoutZones] - Array of rectangular regions to exclude (e.g., home locations)
   *
   * @example
   * ```ts
   * // Define a blackout zone around home (lat/lng rectangle)
   * const blackoutZones: LatLngRect[] = [
   *   [[9.100, -83.650], [9.110, -83.640]]  // [[lat1, lng1], [lat2, lng2]]
   * ];
   *
   * // Apply filtering
   * activity.filterCoordinates(ctx, true, blackoutZones);
   * // Logs: "Filtered 244 points in blackout zones and 2235 duplicate points for ..."
   * ```
   */
  filterTrackPoints(ctx: this['Context'], dedup: boolean, blackoutZones?: LatLngRect[]) {
    const len0 = this.#trackPoints.length;
    if (_.isNonEmptyArray(blackoutZones)) {
      this.#trackPoints = this.#trackPoints.filter((pt) => {
        const rm = pointIsInRects(pt as TrackPoint, blackoutZones);
        if (rm) {
          ctx.log.spam.text('Blackout').value(pt.lat).value(pt.lng).value(pt.time).emit();
        }
        return rm ? false : true;
      });
    }
    const len1 = this.#trackPoints.length;

    // Then remove intermediate duplicate points
    if (dedup && this.#trackPoints.length > 2) {
      const filtered: TrackPoint[] = [];

      for (let i = 0; i < this.#trackPoints.length; i++) {
        const pt = this.#trackPoints[i];

        // Always keep the first point
        if (i === 0) {
          filtered.push(pt);
          continue;
        }

        // Always keep the last point
        if (i === this.#trackPoints.length - 1) {
          filtered.push(pt);
          continue;
        }

        const prev = this.#trackPoints[i - 1];
        const next = this.#trackPoints[i + 1];

        // Check if current point is an intermediate duplicate
        const isSameAsPrev = pt.lat === prev.lat && pt.lng === prev.lng;
        const isSameAsNext = pt.lat === next.lat && pt.lng === next.lng;

        // Only keep if it's NOT an intermediate duplicate
        if (!(isSameAsPrev && isSameAsNext)) {
          filtered.push(pt);
        } else {
          ctx.log.spam.text('Dedup').value(pt.lat).value(pt.lng).value(pt.time).emit();
        }
      }

      this.#trackPoints = filtered;
    }
    const len2 = this.#trackPoints.length;
    // Log the results properly
    const blackoutRemoved = len0 - len1;
    const dedupRemoved = len1 - len2;
    const totalRemoved = len0 - len2;

    if (totalRemoved > 0) {
      const line = ctx.log.info.text('Filtered');
      if (blackoutRemoved > 0) {
        line.count(blackoutRemoved).text('point').text('in blackout zones');
      }
      if (dedupRemoved > 0) {
        if (blackoutRemoved) {
          line.text('and');
        }
        line.count(dedupRemoved).text('duplicate point');
      }
      line.text('for').value(this.toString()).emit();
    }
  }

  /**
   * Fetches detailed activity data from the Strava API and updates this activity.
   *
   * Upgrades a summary activity to a detailed activity by fetching additional fields such as:
   * - segment_efforts (for starred segment matching)
   * - laps (for lap waypoint generation)
   * - description and private_note (for PDF/XML export)
   *
   * This method is idempotent - it only fetches data once and returns immediately on subsequent calls.
   *
   * @param ctx - Application context with logging
   *
   * @example
   * ```ts
   * // Start with summary activity
   * const activity = new Activity(summaryData);
   *
   * // Upgrade to detailed
   * await activity.getDetailed(ctx);
   *
   * // Now has access to laps, segment_efforts, description
   * if ('laps' in activity.data) {
   *   console.log(`Activity has ${activity.data.laps.length} laps`);
   * }
   * ```
   */
  async getDetailed(ctx: this['Context']): Promise<void> {
    assert(this.api, 'api not set');
    if (this.#detailed) {
      return;
    }
    try {
      const m0 = ctx.log.mark();
      const detailedActivity = await this.api.getDetailedActivity(ctx, this.data);
      this.data = detailedActivity;
      this.#detailed = true;
      ctx.log.info.h2('Retrieved detailed activity data for').value(this.toString()).ewt(m0);
    } catch (_e) {
      ctx.log.warn.warn('Failed to fetch detailed data for').value(this.name).emit();
    }
  }

  /**
   * Adds a detailed segment to the activity.
   *
   * This method will apply any configured aliases to the segment name before adding it to the activity.
   *
   * @param segEffort The segment effort to add.
   * @private
   */
  private _addDetailSegment(segEffort: SegmentEffort) { // Updated type to SegmentEffort
    let name = String(segEffort.name).trim();
    const aliases = this.#aliases; // Use injected aliases
    if (aliases && aliases[name]) {
      name = aliases[name];
      segEffort.name = name;
    }
    const sd: string = new DateEx(segEffort.elapsed_time * 1000).format('HH:mm:ss'); // Replaced dateutil.formatMS
    console.log(`  Adding segment '${name}, elapsed time ${sd}`);
    // Add segment to this activity
    this.#segments.push(segEffort); // Removed redundant cast
  }

  /**
   * Checks if the activity should be included based on the provided filter.
   *
   * This method is useful for filtering a list of activities based on various criteria.
   *
   * @param filter The filter to apply.
   * @returns `true` if the activity should be included, `false` otherwise.
   */
  public include(filter: ActivityFilter): boolean { // Updated type to Filter
    if (
      (!filter.commuteOnly && !filter.nonCommuteOnly) ||
      (filter.commuteOnly && this.commute) ||
      (filter.nonCommuteOnly && !this.commute)
    ) {
      if (Array.isArray(filter.exclude)) {
        if (filter.exclude.indexOf(this.type) >= 0) {
          return false;
        }
      }
      if (Array.isArray(filter.include)) {
        if (filter.include.indexOf(this.type) < 0) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Attaches starred segment efforts to this activity.
   *
   * This method filters the activity's segment efforts to include only those that are starred,
   * and applies segment name aliases (if provided in the starredSegments map).
   *
   * @param starredSegments Map of segment ID to (possibly aliased) segment name.
   *                        This map identifies which segments are starred and provides their names.
   * @returns Number of starred segment efforts found and attached
   */
  attachStarredSegments(starredSegments: StarredSegmentDict): Integer {
    assert(this.#detailed, 'DetailedActivity data has not been downloaded');
    // Check if activity has segment_efforts
    if (!('segment_efforts' in this.data) || !_.isArray(this.data.segment_efforts)) {
      return 0;
    }

    const segmentEfforts = this.data.segment_efforts;

    // Filter to only starred segments (those in the map)
    const starredEfforts = segmentEfforts.filter((effort) =>
      effort.segment && effort.segment.id && effort.segment.id in starredSegments
    );

    if (starredEfforts.length > 0) {
      // Add segment efforts to activity with aliased names from the map
      this.segments = starredEfforts.map((effort) => {
        const segmentId = effort.segment?.id;
        const segmentName = segmentId !== undefined && segmentId in starredSegments
          ? starredSegments[segmentId]
          : effort.segment?.name?.trim() || 'Unknown';

        // Return the full DetailedSegmentEffort but with aliased name
        return {
          ...effort,
          name: segmentName,
        };
      });
    }

    return starredEfforts.length;
  }

  /**
   * A comparison function for sorting activities by their start date.
   *
   * This can be used with `Array.prototype.sort()` to sort an array of activities.
   *
   * @param a The first activity.
   * @param b The second activity.
   * @returns -1 if `a` is before `b`, 1 if `a` is after `b`, and 0 if they are at the same time.
   */
  public static compareStartDate(a: { startDate: Date }, b: { startDate: Date }): CompareResult {
    if (a.startDate < b.startDate) {
      return -1;
    }
    if (a.startDate > b.startDate) {
      return 1;
    }
    return 0;
  }
}

/**
 * Checks if a coordinate point falls within any of the specified rectangular regions.
 *
 * Used for blackout zone filtering to exclude sensitive locations (e.g., home, work)
 * from exported GPX/KML files. Rectangles are defined by two opposing corners.
 *
 * @param pt - Coordinate point to check (with lat/lng)
 * @param rects - Array of rectangular regions defined by two corner points
 * @returns `true` if the point is inside any rectangle, `false` otherwise
 *
 * @example
 * ```ts
 * const point: TrackPoint = { lat: 9.105, lng: -83.645 };
 * const blackoutZones: LatLngRect[] = [
 *   [[9.100, -83.650], [9.110, -83.640]]  // Home area
 * ];
 *
 * if (pointIsInRects(point, blackoutZones)) {
 *   console.log('Point is in a blackout zone - exclude from export');
 * }
 * ```
 */
function pointIsInRects(pt: TrackPoint, rects: LatLngRect[]): boolean {
  return rects.some((rect) => {
    const [[lat1, lng1], [lat2, lng2]] = rect;

    // Calculate the actual bounds of the rectangle
    const minLat = Math.min(lat1, lat2);
    const maxLat = Math.max(lat1, lat2);
    const minLng = Math.min(lng1, lng2);
    const maxLng = Math.max(lng1, lng2);

    // Check if point is within bounds
    return pt.lat >= minLat && pt.lat <= maxLat &&
      pt.lng >= minLng && pt.lng <= maxLng;
  });
}
