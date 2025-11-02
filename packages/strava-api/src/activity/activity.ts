import type { ISODate } from '@epdoc/datetime';
import { DateEx } from '@epdoc/datetime'; // Import DateEx
import type { Seconds } from '@epdoc/duration';
import { _, type Dict } from '@epdoc/type';
import type * as Schema from '../schema/mod.ts';
import type { Coord, Kilometres, Metres } from '../types.ts';
import type { Filter, SegmentData, SegmentEffort } from './types.ts'; // Corrected import for new types

const REGEX = {
  noKmlData: /^(Workout|Yoga|Weight Training)$/i,
};

/**
 * Represents a Strava activity.
 *
 * This class encapsulates the data for a Strava activity and provides convenient methods for accessing and manipulating
 * that data.
 */
export class Activity {
  public data: Schema.SummaryActivity | Schema.DetailedActivity;
  private _coordinates: Coord[] = []; // will contain the latlng coordinates for the activity
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
  get startDate(): Date {
    return new Date(this.data.start_date);
  }

  /**
   * Returns a string representation of the activity, including the date, type, distance, and name.
   */
  public toString(): string {
    const d = Math.round(this.data.distance / 100) / 10;
    return `${this.data.start_date_local.slice(0, 10)}, ${this.type} ${d} km, ${this.name}`;
  }

  /**
   * The geographical coordinates of the activity, represented as an array of [latitude, longitude] pairs.
   */
  public get coordinates(): Coord[] {
    return this._coordinates;
  }

  public set coordinates(val: Coord[]) {
    this._coordinates = val;
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
  public get id(): number {
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
  public get gearId(): string {
    return this.data.gear_id;
  }

  /**
   * The start date of the activity in the local timezone, in ISO 8601 format.
   */
  public get startDateLocal(): ISODate {
    return this.data.start_date_local;
  }

  /**
   * The segment efforts associated with the activity.
   */
  public get segments(): SegmentData[] { // Updated type to SegmentData[]
    return this.#segments; // Use private property
  }

  /**
   * The type of the activity (e.g., 'Ride', 'Run').
   */
  public get type(): string {
    return this.data.type;
  }

  /**
   * Checks if the activity is a ride or an e-bike ride.
   */
  public isRide(): boolean {
    return this.data.type === 'Ride' || this.data.type === 'EBikeRide';
  }

  /**
   * Checks if the activity has KML data.
   *
   * Some activity types, such as workouts, yoga, and weight training, do not have KML data.
   */
  public hasKmlData(): boolean {
    if (!_.isString(this.type) || REGEX.noKmlData.test(this.type)) {
      return false;
    }
    return this._coordinates.length > 0 ? true : false;
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
      } else {
        result.description = this.data.description;
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
  public include(filter: Filter) { // Updated type to Filter
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
   * A comparison function for sorting activities by their start date.
   *
   * This can be used with `Array.prototype.sort()` to sort an array of activities.
   *
   * @param a The first activity.
   * @param b The second activity.
   * @returns -1 if `a` is before `b`, 1 if `a` is after `b`, and 0 if they are at the same time.
   */
  public static compareStartDate(a: Activity, b: Activity) {
    if (a.startDate < b.startDate) {
      return -1;
    }
    if (a.startDate > b.startDate) {
      return 1;
    }
    return 0;
  }
}
