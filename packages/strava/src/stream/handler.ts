import type * as FS from '@epdoc/fs/fs';
import { assert } from 'node:console';
import type * as Ctx from '../context.ts';
import type { Activity } from '../dep.ts';
import type * as Segment from '../segment/mod.ts';
import { GpxWriter } from './gpx.ts';
import { KmlWriter } from './kml.ts';
import { defaultKmlLineStyles } from './linestyles.ts';
import type { StreamWriter } from './streamer.ts';
import type * as Stream from './types.ts';

type SegmentData = Segment.Data;
type PlacemarkParams = Stream.KmlPlacemarkParams;

const REGEX = {
  color: /^[a-zA-Z0-9]{8}$/,
  moto: /^moto$/i,
  isGpx: /\.gpx$/i,
  isKml: /\.kml$/i,
};

/**
 * Generates KML (Keyhole Markup Language) files for visualizing Strava activities in Google Earth.
 *
 * This class handles the complete workflow of converting Strava activities and segments into
 * KML format suitable for viewing in Google Earth. It provides:
 * - Activity routes as colored line strings (color-coded by activity type)
 * - Lap markers as clickable point placemarks
 * - Segment routes with hierarchical folder organization by region
 * - Custom line styles for different activity types (Ride, Run, Swim, etc.)
 * - Support for both imperial and metric units
 * - Detailed activity descriptions when --more flag is enabled
 *
 * The generated KML files include proper styling, descriptions, and folder organization
 * for easy navigation in Google Earth.
 *
 * @example
 * ```ts
 * const kml = new KmlMain({ activities: true, laps: true, imperial: false });
 * kml.setLineStyles(ctx, customStyles);
 * await kml.outputData(ctx, 'output.kml', activities, segments);
 * ```
 */
export class Handler {
  private opts: Stream.Opts = {};
  private kmlLinestyles: Stream.KmlLineStyleDefs = defaultKmlLineStyles;
  #writer?: StreamWriter;

  /**
   * @param [opts={}] - KML generation options.
   */
  constructor(opts: Stream.Opts = {}) {
    this.opts = opts;
  }

  /**
   * Overwrites the current KML generation options.
   * @param [opts={}] - KML generation options.
   */
  setOptions(opts: Stream.Opts = {}) {
    this.opts = opts;
  }

  /**
   * Indicates if units should be imperial.
   * @returns `true` if imperial units should be used, `false` otherwise.
   */
  get imperial(): boolean {
    return this.opts && this.opts.imperial === true;
  }

  /**
   * Indicates if detailed descriptions should be included.
   * @returns `true` if detailed descriptions are enabled, `false` otherwise.
   */
  get more(): boolean {
    return this.opts && this.opts.more === true;
  }

  /**
   * Indicates if segment effort data should be included.
   * @returns `true` if effort data is enabled, `false` otherwise.
   */
  get efforts(): boolean {
    return this.opts && this.opts.efforts === true;
  }

  initWriter(_ctx: Ctx.Context, filepath: FS.Path): StreamWriter | undefined {
    assert(!this.#writer, 'writer is already initialized');
    const pathStr = typeof filepath === 'string' ? filepath : (filepath as unknown as { path: string }).path;

    // Determine writer type based on file extension or path characteristics
    if (REGEX.isKml.test(pathStr)) {
      this.#writer = new KmlWriter(this.opts);
    } else {
      // If path has no extension or is a folder, assume GPX output
      this.#writer = new GpxWriter(this.opts);
    }
    return this.#writer;
  }

  /**
   * Generates a complete KML file from Strava activities and segments.
   *
   * This is the main public method that orchestrates the entire KML generation process.
   * It creates a KML file containing:
   * - Header with custom line styles and lap marker styles
   * - Activities folder with route placemarks and optional lap markers
   * - Segments folder with hierarchical or flat organization
   * - Footer to close the KML document
   *
   * The method uses buffered writing for performance and ensures proper resource cleanup
   * via try/catch blocks.
   *
   * @param ctx Application context with logging
   * @param filepath Output file path for the KML file
   * @param activities Array of Strava activities with coordinates
   * @param segments Array of starred segments with coordinates
   *
   * @example
   * ```ts
   * const kml = new KmlMain({ activities: true, segments: true, laps: true });
   * await kml.outputData(ctx, 'strava.kml', activities, segments);
   * // Creates strava.kml ready for Google Earth
   * ```
   */
  async outputData(
    ctx: Ctx.Context,
    filepath: FS.Path,
    activities: Activity[],
    segments: SegmentData[],
  ): Promise<void> {
    const _m0 = ctx.log.mark();
    const pathStr = typeof filepath === 'string' ? filepath : (filepath as unknown as { path: string }).path;

    // Determine output type based on file extension
    if (REGEX.isKml.test(pathStr)) {
      const kmlWriter = new KmlWriter(this.opts);
      await kmlWriter.outputData(ctx, pathStr as FS.FilePath, activities, segments);
    } else {
      // GPX output to folder
      const gpxWriter = new GpxWriter(this.opts);
      await gpxWriter.outputData(ctx, pathStr as FS.FolderPath, activities);
    }
  }
}
