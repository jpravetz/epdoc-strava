import * as FS from '@epdoc/fs/fs';
import { _, type Integer } from '@epdoc/type';
import pkg from '../../deno.json' with { type: 'json' };
import type * as Ctx from '../context.ts';
import { type Activity, Api } from '../dep.ts';
import type * as Segment from '../segment/mod.ts';
import { StreamWriter } from './streamer.ts';
import type * as Stream from './types.ts';

type SegmentData = Segment.Data;
type PlacemarkParams = Stream.KmlPlacemarkParams;

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
export class GpxWriter extends StreamWriter {
  override streamTypes(): Api.Schema.StreamType[] {
    return [
      Api.Schema.StreamKeys.LatLng,
      Api.Schema.StreamKeys.Altitude,
      Api.Schema.StreamKeys.Time,
    ];
  }

  /**
   * Generates a complete GPX file from Strava activities.
   *
   * This is the main public method that orchestrates the entire KML generation process.
   * It creates a GPX file containing:
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
    folderpath: FS.FolderPath,
    activities: Activity[],
  ): Promise<void> {
    const fsFolder = new FS.Folder(folderpath);
    const m0 = ctx.log.mark();
    ctx.log.info.h2('Generating GPX files in folder').fs(folderpath).emit();
    ctx.log.indent();
    for (const activity of activities) {
      await this.outputActivity(ctx, fsFolder, activity);
    }
    ctx.log.outdent();
    ctx.log.info.h2('Generated').count(activities.length).h2('GPX file').h2('successfully').ewt(m0);
  }

  async outputActivity(
    ctx: Ctx.Context,
    folderpath: FS.Folder,
    activity: Activity,
  ): Promise<void> {
    const m0 = ctx.log.mark();
    // Generate filename: YYYYMMDD_Activity_Name.gpx
    const filename = activity.data.start_date_local.split('T')[0].replace(/-/g, '') + '_' +
      activity.name.replace(/\s+/g, '_') + '.gpx';
    const fsFile: FS.File = new FS.File(folderpath, filename);
    this.writer = await fsFile.writer();

    try {
      await this.#header(activity);

      // Output track points
      for (const coord of activity.coordinates) {
        this.#outputCoordinate(3, coord, activity);
      }

      await this.#closeTrackSegment();

      // Output lap waypoints if laps flag is enabled
      if (
        this.opts.laps && 'laps' in activity.data && _.isArray(activity.data.laps) &&
        activity.data.laps.length > 1
      ) {
        await this.#outputLapWaypoints(activity);
      }

      await this.#footer();
      await this.writer.close();

      ctx.log.info.text('Wrote').count(activity.coordinates.length).text('point').text(
        'to GPX file',
      )
        .fs(fsFile).ewt(m0);
    } catch (err) {
      if (this.writer) {
        await this.writer.close();
      }
      throw err;
    }
  }

  /**
   * Writes a GPX track point with coordinates, elevation, and time.
   *
   * @private
   * @param indent - The indentation level for the GPX output.
   * @param coord - The coordinate data containing lat, lng, altitude, and time.
   */
  #outputCoordinate(indent: number, coord: Partial<Api.CoordData>, activity: Activity): void {
    const lines: string[] = [`<trkpt lat="${coord.lat}" lon="${coord.lng}">`];

    if (coord.altitude !== undefined) {
      lines.push(`  <ele>${coord.altitude}</ele>`);
    }

    if (coord.time) {
      const dateEx = activity.startDateEx(coord.time);
      lines.push(`  <time>${dateEx.toISOLocalString()}</time>`);
    }

    lines.push(`</trkpt>`);
    this.writelns(indent, lines);
  }

  /**
   * Writes the GPX file header with document structure and metadata.
   *
   * The header includes:
   * - XML declaration and GPX namespace declarations
   * - Metadata with timezone-aware start time
   * - Track element with activity name and type
   *
   * All content is buffered and flushed after header generation.
   */
  async #header(activity: Activity): Promise<void> {
    // Convert start date to timezone-aware format
    const startDateEx = activity.startDateEx();
    const startTime = startDateEx.toISOLocalString();

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<gpx creator="${pkg.name.replace('@', '').replace('/', '-')}" version="1.1"`,
      'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/11.xsd"',
      'xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"',
      'xmlns="http://www.topografix.com/GPX/1/1"',
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      'xmlns:ns2="http://www.garmin.com/xmlschemas/GpxExtensions/v3">',
      '  <metadata>',
      `    <time>${startTime}</time>`,
      '  </metadata>',
      '  <trk>',
      `    <name>${activity.name}</name>`,
      `    <type>${activity.type}</type>`,
      '    <trkseg>',
    ];
    this.writelns(0, lines);

    await this.flush();
  }

  /**
   * Closes the current track segment.
   */
  async #closeTrackSegment(): Promise<void> {
    this.writeln(2, '</trkseg>');
    this.writeln(1, '</trk>');
    await this.flush();
  }

  /**
   * Outputs lap waypoints for the activity.
   *
   * Creates waypoint markers at each lap button press location (excluding the last lap
   * which is at the end of the activity). Each waypoint includes a comment with:
   * - Distance since previous lap
   * - Point elevation
   * - Elevation delta since previous lap
   * - Gradient percentage
   *
   * Uses time-based matching to handle coordinate filtering (deduplication and blackout zones).
   *
   * @param activity The activity with lap and coordinate data
   */
  async #outputLapWaypoints(activity: Activity): Promise<Integer> {
    if (!('laps' in activity.data) || !_.isArray(activity.data.laps)) {
      return 0;
    }

    const laps = activity.data.laps as Api.Schema.Lap[];
    if (!laps || laps.length <= 1) {
      return 0;
    }

    // Skip the last lap as it's at the end of the activity
    let count = 0;
    let prevElevation: number | undefined = undefined;
    let cumulativeTime = 0; // Track cumulative elapsed time

    for (let i = 0; i < laps.length - 1; i++) {
      const lap = laps[i];

      // Calculate cumulative time to end of this lap
      // lap.elapsed_time is the duration of THIS lap, not cumulative
      cumulativeTime += lap.elapsed_time;

      // Find the coordinate closest to this cumulative time
      // This works even after coordinate filtering (dedup + blackout)
      const coord = this.#findCoordinateAtTime(activity, cumulativeTime);

      if (!coord) {
        continue;
      }

      // Calculate metrics for comment
      const distanceKm = (lap.distance / 1000).toFixed(2);
      const elevation = coord.altitude ?? 0;
      let elevDelta = 0;
      let gradient = 0;

      if (prevElevation !== undefined && lap.distance > 0) {
        elevDelta = elevation - prevElevation;
        gradient = (elevDelta / lap.distance) * 100; // Convert to percentage
      }

      // Build comment with lap statistics
      const comment = `Distance: ${distanceKm} km, Elevation: ${elevation.toFixed(1)} m` +
        (prevElevation !== undefined
          ? `, Delta: ${elevDelta > 0 ? '+' : ''}${elevDelta.toFixed(1)} m, Gradient: ${
            gradient.toFixed(1)
          }%`
          : '');

      this.writeln(1, '<wpt lat="' + coord.lat + '" lon="' + coord.lng + '">');
      this.writeln(2, '<name>Lap ' + (i + 1) + '</name>');

      if (coord.altitude !== undefined) {
        this.writeln(2, '<ele>' + coord.altitude + '</ele>');
      }

      if (coord.time) {
        this.writeln(2, '<time>' + coord.time + '</time>');
      }

      this.writeln(2, '<cmt>' + comment + '</cmt>');
      this.writeln(2, '<type>Lap</type>');
      this.writeln(1, '</wpt>');

      prevElevation = elevation;
      ++count;
    }

    await this.flush();
    return count;
  }

  /**
   * Finds the coordinate closest to a given elapsed time.
   *
   * @param activity The activity with coordinates
   * @param elapsedTime The elapsed time in seconds from activity start
   * @returns The coordinate closest to the given time, or undefined
   */
  #findCoordinateAtTime(
    activity: Activity,
    elapsedTime: number,
  ): Partial<Api.CoordData> | undefined {
    if (!activity.coordinates || activity.coordinates.length === 0) {
      return undefined;
    }

    // If we have time data in coordinates, find by matching time
    if (activity.coordinates[0].time) {
      const targetTime = new Date(
        activity.startDate.getTime() + elapsedTime * 1000,
      );

      let closestCoord = activity.coordinates[0];
      let closestDiff = Infinity;

      for (const coord of activity.coordinates) {
        if (coord.time) {
          const coordTime = new Date(coord.time);
          const diff = Math.abs(coordTime.getTime() - targetTime.getTime());
          if (diff < closestDiff) {
            closestDiff = diff;
            closestCoord = coord;
          }
        }
      }

      return closestCoord;
    }

    // Fallback: estimate based on array position
    // Assume coordinates are evenly distributed over activity duration
    const totalTime = activity.data.elapsed_time;
    const ratio = elapsedTime / totalTime;
    const index = Math.floor(ratio * activity.coordinates.length);

    return activity.coordinates[Math.min(index, activity.coordinates.length - 1)];
  }

  /**
   * Writes the GPX file footer to close the document structure.
   *
   * Closes the GPX document and flushes the buffer to ensure
   * all content is written to the file.
   */
  async #footer(): Promise<void> {
    this.writeln(0, '</gpx>');
    await this.flush();
  }
}
