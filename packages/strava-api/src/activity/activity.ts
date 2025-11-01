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

export class Activity {
  public data: Schema.SummaryActivity | Schema.DetailedActivity;
  // public keys: string[] = [
  //   'distance',
  //   'total_elevation_gain',
  //   'moving_time',
  //   'elapsed_time',
  //   'average_temp',
  //   'device_name',
  // ];
  // public keyDict: Dict = {
  //   distance: 'distance',
  //   totalElevationGain: 'total_elevation_gain',
  //   movingTime: 'moving_time',
  //   elapsedTime: 'elapsed_time',
  //   averageTemp: 'average_temp',
  //   deviceName: 'device_name',
  // };

  // public main: Main; // Removed reference to main
  private _coordinates: Coord[] = []; // will contain the latlng coordinates for the activity
  #segments: SegmentData[] = []; // Will be declared here
  #aliases?: Record<string, string>; // Private property for aliases
  #segmentProvider?: { getSegment(name: string): Schema.SummarySegment | undefined }; // Private property for segment provider

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

  update(data: Schema.SummaryActivity | Schema.DetailedActivity) {
    this.data = data;
  }

  get startDate(): Date {
    return new Date(this.data.start_date);
  }

  public toString(): string {
    const d = Math.round(this.data.distance / 100) / 10;
    return `${this.data.start_date_local.slice(0, 10)}, ${this.type} ${d} km, ${this.name}`;
  }

  public get coordinates(): Coord[] {
    return this._coordinates;
  }

  public set coordinates(val: Coord[]) {
    this._coordinates = val;
  }

  public get name(): string {
    return this.data.name;
  }

  public get id(): number {
    return this.data.id;
  }

  public get movingTime(): Seconds {
    return this.data.moving_time;
  }

  public get elapsedTime(): Seconds {
    return this.data.elapsed_time;
  }

  public get distance(): Metres {
    return this.data.distance;
  }

  public distanceRoundedKm(): Kilometres {
    return Math.round(this.data.distance / 10) / 100;
  }

  public get totalElevationGain(): Metres {
    return this.data.total_elevation_gain;
  }

  public get averageTemp(): number {
    return this.data.average_temp;
  }

  public get deviceName(): string {
    return this.data.device_name;
  }

  get commute(): boolean {
    return this.data.commute;
  }

  public get gearId(): string {
    return this.data.gear_id;
  }

  public get startDateLocal(): ISODate {
    return this.data.start_date_local;
  }

  public get segments(): SegmentData[] { // Updated type to SegmentData[]
    return this.#segments; // Use private property
  }

  public get type(): string {
    return this.data.type;
  }

  public isRide(): boolean {
    return this.data.type === 'Ride' || this.data.type === 'EBikeRide';
  }

  public hasKmlData(): boolean {
    if (!_.isString(this.type) || REGEX.noKmlData.test(this.type)) {
      return false;
    }
    return this._coordinates.length > 0 ? true : false;
  }

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
