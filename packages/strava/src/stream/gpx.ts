import * as FS from '@epdoc/fs/fs';
import pkg from '../../deno.json' with { type: 'json' };
import type * as Ctx from '../context.ts';
import { type Activity, Api } from '../dep.ts';
import type * as Segment from '../segment/mod.ts';
import { StreamWriter } from './streamer.ts';
import type * as Stream from './types.ts';

type SegmentData = Segment.Data;
type PlacemarkParams = Stream.KmlPlacemarkParams;

const REGEX = {
  color: /^[a-zA-Z0-9]{8}$/,
  moto: /^moto$/i,
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
    for (const activity of activities) {
      await this.outputActivity(ctx, fsFolder, activity);
    }
  }

  async outputActivity(
    ctx: Ctx.Context,
    folderpath: FS.Folder,
    activity: Activity,
  ): Promise<void> {
    const m0 = ctx.log.mark();
    const filename = activity.data.start_date_local.split('T')[0].replace(/-/g, '') + '_' +
      activity.name.replace(/\s+/, '_') + '.gpx';
    const fsFile: FS.File = new FS.File(FS.Folder.cwd(), folderpath, filename);
    this.writer = await fsFile.writer();

    try {
      await this.#header(activity);

      for (const coord of activity.coordinates) {
        this.#outputCoordinate(3, coord);
      }

      await this.#footer();
      await this.writer.close();

      ctx.log.verbose.text('Wrote').fs(fsFile).ewt(m0);
    } catch (err) {
      if (this.writer) {
        await this.writer.close();
      }
      throw err;
    }
  }

  /**
   * Writes a complete KML `<Placemark>` block for a LineString.
   *
   * @private
   * @param indent - The indentation level for the KML output.
   * @param params - The parameters for the placemark.
   */
  #outputCoordinate(indent: number, coord: Api.CoordData): void {
    const lines: string[] = [
      `<trkpt lat="${coord.latlng[0]}" lon="${coord.latlng[1]}">`,
      `  <ele>${coord.elevation}</ele>`,
      `  <time>${coord.date}</time>`,
      `</trkpt>`,
    ];
    this.writelns(indent, lines);
  }

  /**
   * Formats elapsed time in seconds to MM:SS or HH:MM:SS format.
   * @param seconds Elapsed time in seconds
   * @returns Formatted time string
   */
  #formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Writes the KML file header with document structure and style definitions.
   *
   * The header includes:
   * - XML declaration and KML namespace declarations
   * - Document element with name and open state
   * - LineStyle definitions for all activity types and categories
   * - Lap marker style (if --laps flag is enabled)
   *
   * All content is buffered and flushed after header generation.
   */
  async #header(activity: Activity): Promise<void> {
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<gpx creator="${pkg.name}" version="${pkg.version}"`,
      'xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/11.xsd"',
      'xmlns:ns3="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"',
      'xmlns="http://www.topografix.com/GPX/1/1"',
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      'xmlns:ns2="http://www.garmin.com/xmlschemas/GpxExtensions/v3">',
      '  <metadata>',
      `    <time>${activity.data.start_date}</time>`,
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
   * Writes the KML file footer to close the document structure.
   *
   * Closes the Document and kml elements, then flushes the buffer to ensure
   * all content is written to the file.
   */
  async #footer(): Promise<void> {
    this.writeln(2, '</trkseg>\n');
    this.writeln(1, '</trk>\n');
    this.writeln(0, '</gpx>\n');
    await this.flush();
  }
}
