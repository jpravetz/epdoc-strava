import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import type * as Ctx from '../context.ts';
import type { Activity, Api } from '../dep.ts';
import { escapeHtml, Fmt } from '../fmt.ts';
import type * as Segment from '../segment/mod.ts';
import { isValidActivityType, isValidLineStyle } from './guards.ts';
import { defaultKmlLineStyles } from './linestyles.ts';
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
export class KmlWriter extends StreamWriter {
  private lineStyles: Stream.KmlLineStyleDefs = defaultKmlLineStyles;
  private trackIndex: number = 0;

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

  /**
   * Sets custom line styles for activity routes in the KML output.
   *
   * Allows customization of line colors and widths for different activity types
   * (e.g., Ride, Run, Swim) and special categories (Default, Commute, Moto, Segment).
   * Invalid styles are logged as warnings and ignored.
   *
   * @param ctx Application context with logging
   * @param styles Dictionary of line styles keyed by activity type or custom category
   *
   * @example
   * ```ts
   * const customStyles = {
   *   Ride: { color: "FF0000FF", width: 3 },      // Red, 3px wide
   *   Run: { color: "FF00FF00", width: 2 },       // Green, 2px wide
   *   Commute: { color: "FFFF0000", width: 2 }    // Blue, 2px wide
   * };
   * kml.setLineStyles(ctx, customStyles);
   * ```
   */
  setLineStyles(ctx: Ctx.Context, styles: Stream.KmlLineStyleDefs) {
    Object.entries(styles).forEach(([name, style]) => {
      if (isValidActivityType(name) && isValidLineStyle(style)) {
        this.lineStyles[name] = style;
      } else {
        ctx.log.warn.warn('Warning: ignoring line style error')
          .value(name).text('Style must be in form \'{ "color": "C03030C0", "width": 2 }\'').emit();
      }
    });
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
    filepath: FS.FilePath,
    activities: Activity[],
    segments: SegmentData[],
  ): Promise<void> {
    const m0 = ctx.log.mark();
    const file = filepath || 'Activities.kml';
    const fsFile: FS.File = new FS.File(FS.Folder.cwd(), filepath);
    this.writer = await fsFile.writer();

    try {
      await this.#header();

      if (this.opts.type) {
        await this.#addActivities(ctx, activities);
      }

      if (this.opts.segments) {
        await this.addSegments(segments);
      }

      await this.#footer();
      await this.writer.close();

      ctx.log.verbose.text('Wrote').fs(file).ewt(m0);
    } catch (err) {
      if (this.writer) {
        await this.writer.close();
      }
      throw err;
    }
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
  async #header(): Promise<void> {
    this.write(0, '<?xml version="1.0" encoding="UTF-8"?>\n');
    this.writeln(
      0,
      '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">',
    );
    this.writeln(1, '<Document>');
    this.writeln(2, '<name>Strava Activities</name>');
    this.writeln(2, '<open>1</open>');
    Object.keys(this.lineStyles).forEach((name) => {
      if (isValidActivityType(name)) {
        this.#addLineStyle(name, this.lineStyles[name] as Stream.KmlLineStyle);
      }
    });
    // Add lap marker style if laps are enabled
    if (this.opts.laps) {
      this.#addLapMarkerStyle();
    }
    await this.flush();
  }

  /**
   * Writes the KML file footer to close the document structure.
   *
   * Closes the Document and kml elements, then flushes the buffer to ensure
   * all content is written to the file.
   */
  async #footer(): Promise<void> {
    this.write(1, '</Document>\n</kml>\n');
    await this.flush();
  }

  /**
   * Adds a folder of activities to the KML file.
   *
   * @private
   * @param ctx - The application context.
   * @param activities - An array of activities to include.
   */
  async #addActivities(ctx: Ctx.Context, activities: Activity[]): Promise<void> {
    if (activities && activities.length) {
      const dateString = this.#dateString();

      const indent = 2;
      this.writeln(
        indent,
        '<Folder><name>Activities' + (dateString ? ' ' + dateString : '') + '</name><open>1</open>',
      );

      for (const activity of activities) {
        if (activity.hasKmlData()) {
          await this.outputActivity(ctx, indent + 1, activity);
        }
        await this.flush();
      }

      this.writeln(indent, '</Folder>');
      await this.flush();
    }
  }

  /**
   * Generates a date string for folder names based on the date range options.
   *
   * @private
   * @returns A formatted string representing the date range(s).
   */
  #dateString(): string {
    if (this.opts.date && this.opts.date.hasRanges()) {
      const ad: string[] = [];
      this.opts.date.ranges.forEach((range) => {
        const after = range.after ? range.after.toISOString().slice(0, 10) : '';
        const before = range.before ? range.before.toISOString().slice(0, 10) : '';
        if (after && before) {
          ad.push(`${after} to ${before}`);
        } else if (after) {
          ad.push(`from ${after}`);
        } else if (before) {
          ad.push(`until ${before}`);
        }
      });
      return ad.join(', ');
    }
    return '';
  }

  /**
   * Adds starred segments to the KML file with hierarchical or flat folder organization.
   *
   * Segments can be organized in two ways:
   * - **Hierarchical**: Groups segments by country and state (e.g., "Segments for California, USA")
   * - **Flat**: All segments in a single folder
   *
   * The organization is controlled by the `segments` option ('flat' for flat, otherwise hierarchical).
   * Segments are sorted alphabetically by name.
   *
   * @param segments Array of starred segments with coordinates and location data
   */
  public async addSegments(segments: SegmentData[]): Promise<void> {
    if (segments && segments.length) {
      const indent = 2;
      const sortedSegments: SegmentData[] = segments.sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
      if (_.isString(this.opts.segments) && this.opts.segments === 'flat') {
        this.outputSegments(indent, sortedSegments);
      } else {
        const regions = this.getSegmentRegionList(segments);
        for (const country of Object.keys(regions)) {
          for (const state of Object.keys(regions[country])) {
            this.outputSegments(indent, sortedSegments, country, state);
          }
        }
        await this.flush();
      }
    }
  }

  /**
   * Outputs a folder of segments with optional country/state filtering.
   *
   * Creates a KML folder containing segment placemarks. If country and state are provided,
   * only segments matching that location are included and the folder name reflects the region.
   * Otherwise, all segments are included in a general "Segments" folder.
   *
   * @param indent Indentation level for KML output
   * @param segments Array of segments to potentially include
   * @param [country] Optional country filter (e.g., "USA")
   * @param [state] Optional state filter (e.g., "California")
   */
  public outputSegments(
    indent: number,
    segments: SegmentData[],
    country?: string,
    state?: string,
  ): void {
    let title = 'Segments';
    const dateString = this.#dateString();
    if (country && state) {
      title += ' for ' + state + ', ' + country;
    } else if (country) {
      title += ' for ' + country;
    }
    this.writeln(indent, '<Folder><name>' + title + '</name><open>1</open>');
    this.writeln(
      indent + 1,
      '<description>Efforts for ' + (dateString ? ' ' + dateString : '') + '</description>',
    );
    segments.forEach((segment) => {
      if (!country || (country === segment.country && state == segment.state)) {
        this.#outputSegment(indent + 2, segment);
      }
    });
    this.writeln(indent, '</Folder>');
  }

  /**
   * Analyzes a list of segments and returns a nested dictionary of their regions.
   *
   * @private
   * @param segments - An array of segments.
   * @returns A dictionary where keys are countries and values are dictionaries of states.
   */
  private getSegmentRegionList(segments: SegmentData[]): Record<string, Record<string, boolean>> {
    const regions: Record<string, Record<string, boolean>> = {};
    segments.forEach((segment) => {
      regions[segment.country] = regions[segment.country] || {};
      if (segment.state) {
        regions[segment.country][segment.state] = true;
      }
    });
    console.log('Segments found in the following regions:\n  ' + JSON.stringify(regions));
    return regions;
  }

  /**
   * Outputs a single activity as a KML LineString placemark with optional lap markers.
   *
   * Creates a KML placemark for the activity route with:
   * - Activity name prefixed with start date
   * - Line style based on activity type (Ride, Run, etc.) or special categories (Commute, Moto)
   * - Route coordinates as LineString
   * - Optional detailed description when --more flag is enabled
   * - Optional lap marker points when --laps flag is enabled
   *
   * The style name is determined by checking: Moto bikes → "Moto", Commute activities → "Commute",
   * otherwise uses the activity type (e.g., "Ride", "Run").
   *
   * @param indent Indentation level for KML output
   * @param activity Strava activity with coordinates and metadata
   */
  async outputActivity(ctx: Ctx.Context, indent: number, activity: Activity): Promise<void> {
    const t0 = activity.startDateLocal.slice(0, 10);
    let styleName = 'Default';

    const bike = activity.gearId && this.opts.bikes ? this.opts.bikes[activity.gearId] : undefined;
    const isMoto: boolean =
      bike && typeof bike === 'object' && 'name' in bike && typeof bike.name === 'string'
        ? REGEX.moto.test(bike.name)
        : false;

    if (isMoto) {
      styleName = 'Moto';
    } else if (activity.commute && defaultKmlLineStyles['Commute']) {
      styleName = 'Commute';
    } else if (defaultKmlLineStyles[activity.type as Stream.ActivityExType]) {
      styleName = activity.type;
    }

    const description = await this.#buildActivityDescription(ctx, activity);
    const params: PlacemarkParams = {
      placemarkId: 'StravaTrack' + ++this.trackIndex,
      name: t0 + ' - ' + escapeHtml(activity.name),
      description: description,
      styleName: styleName,
      coordinates: activity.coordinates,
    };
    this.#placemark(indent, params);

    // Output lap markers if laps are enabled and available
    if (
      this.opts.laps && 'laps' in activity.data && _.isArray(activity.data.laps) &&
      activity.data.laps.length > 1
    ) {
      this.#outputLapMarkers(indent, activity);
    }
  }

  /**
   * Builds the HTML description for an activity placemark.
   *
   * @private
   * @param ctx - The application context.
   * @param activity - The activity for which to build the description.
   * @returns The formatted HTML description, or `undefined` if there is no content.
   */
  async #buildActivityDescription(
    ctx: Ctx.Context,
    activity: Activity,
  ): Promise<string | undefined> {
    const arr: string[] = [];

    // Always add the activity's text description first (if it exists)
    // const customProps = activity.getCustomProperties();
    // if (customProps.description && _.isString(customProps.description)) {
    //   const descLines: string[] = customProps.description.trim().split(/\r?\n/);
    //   descLines.forEach((line) => {
    //     if (line.trim()) {
    //       arr.push(escapeHtml(line));
    //     }
    //   });
    // }

    // If --more or --efforts is enabled, add technical stats
    if (this.more || this.efforts) {
      arr.push(`<b>Distance:</b> ${Fmt.getDistanceString(activity.distance, this.imperial)}`);
      arr.push(
        `<b>Elevation Gain:</b> ${
          Fmt.getElevationString(activity.totalElevationGain, this.imperial)
        }`,
      );
      // TODO: Add moving time, elapsed time, average temp, etc.
    }

    // Always include starred segment times at the end (if any exist)
    const segments = activity.segments;
    const cachedSegments = await ctx.app.getCachedSegments(ctx);

    if (_.isArray(segments) && segments.length > 0) {
      segments.forEach((segment) => {
        // Use segment.name first (contains alias from app.ts), fall back to segment.segment?.name
        const name = segment.name || segment.segment?.name || 'Unknown';
        const time = this.#formatTime(segment.elapsed_time || 0);
        const cachedSeg = cachedSegments.get(segment.id);

        // Format: "Up <name> [MM:SS]" or "Up <name>: <distance>, <elevation>, [MM:SS]" with --efforts
        if (this.efforts && cachedSeg) {
          const distance = Fmt.getDistanceString(cachedSeg.distance || 0, this.imperial);
          const elevation = Fmt.getElevationString(cachedSeg.elevation, this.imperial);
          arr.push(`Up ${escapeHtml(name)}: ${distance}, ${elevation} [${time}]`);
        } else {
          arr.push(`Up ${escapeHtml(name)} [${time}]`);
        }
      });
    }

    return arr.length > 0 ? '<![CDATA[' + arr.join('<br>\n') + ']]>' : undefined;
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
   * Outputs a single segment as a KML LineString placemark.
   *
   * @private
   * @param indent - The indentation level for the KML output.
   * @param segment - The segment data to output.
   */
  #outputSegment(indent: number, segment: SegmentData): void {
    const params = {
      placemarkId: 'StravaSegment' + ++this.trackIndex,
      name: escapeHtml(segment.name),
      description: this.#buildSegmentDescription(segment),
      styleName: 'Segment',
      coordinates: segment.coordinates,
    };
    this.#placemark(indent, params);
  }

  /**
   * Builds the description for a segment placemark.
   *
   * @private
   * @param _segment - The segment data.
   * @returns An empty string (currently a placeholder).
   */
  #buildSegmentDescription(_segment: SegmentData) {
    return '';
  }

  /**
   * Writes a KML `<Style>` block for a line.
   *
   * @private
   * @param name - The name to be used in the style ID (e.g., "Ride").
   * @param style - The line style definition containing color and width.
   */
  #addLineStyle(name: string, style: Stream.KmlLineStyle): void {
    this.write(2, '<Style id="StravaLineStyle' + name + '">\n');
    this.write(
      3,
      '<LineStyle><color>' + style.color + '</color><width>' + style.width +
        '</width></LineStyle>\n',
    );
    this.write(3, '<PolyStyle><color>' + style.color + '</color></PolyStyle>\n');
    this.write(2, '</Style>\n');
  }

  /**
   * Writes the KML `<Style>` block for lap markers.
   *
   * @private
   */
  #addLapMarkerStyle(): void {
    this.write(2, '<Style id="LapMarker">\n');
    this.write(3, '<IconStyle>\n');
    this.write(4, '<scale>0.6</scale>\n');
    this.write(4, '<Icon>\n');
    this.write(
      5,
      '<href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>\n',
    );
    this.write(4, '</Icon>\n');
    this.write(3, '</IconStyle>\n');
    this.write(3, '<LabelStyle>\n');
    this.write(4, '<scale>0</scale>\n'); // Hide label by default
    this.write(3, '</LabelStyle>\n');
    this.write(2, '</Style>\n');
  }

  /**
   * Outputs lap marker placemarks for an activity's lap button presses.
   *
   * Creates a Point placemark for each lap button press in the activity. Each marker:
   * - Uses the lap's start_index to find the coordinate in the activity's coordinate array
   * - Displays as a circular icon in Google Earth
   * - Shows "Lap 1", "Lap 2", etc. when clicked (labels hidden by default)
   *
   * Only outputs markers if the activity has lap data and coordinates. Skips laps with
   * invalid start indices.
   *
   * @param indent - Indentation level for KML output.
   * @param activity - Strava activity with laps array and coordinates.
   */
  #outputLapMarkers(indent: number, activity: Activity): void {
    if (!('laps' in activity.data) || !_.isArray(activity.data.laps)) {
      return;
    }

    const laps = activity.data.laps as Api.Schema.Lap[];
    const coords = activity.coordinates;

    if (!coords || coords.length === 0 || laps.length < 2) {
      return;
    }

    laps.forEach((lap, index) => {
      // Get the coordinate at the lap's start index
      const startIndex = lap.start_index;
      if (startIndex >= 0 && startIndex < coords.length) {
        const coord = coords[startIndex];
        this.#outputLapPoint(indent, index + 1, coord);
      }
    });
  }

  /**
   * Outputs a single lap marker as a KML Point placemark.
   *
   * Creates a circular marker icon at the specified coordinate with a label showing
   * the lap number. The label is hidden by default (scale=0) and only appears when
   * the marker is clicked in Google Earth.
   *
   * @param indent - Indentation level for KML output.
   * @param lapNumber - Lap number for the label (e.g., 1 for "Lap 1").
   * @param coord - Coordinate data object with lat, lng, and optional altitude.
   */
  #outputLapPoint(indent: number, lapNumber: number, coord: Partial<Api.CoordData>): void {
    this.writeln(indent, '<Placemark id="LapMarker' + ++this.trackIndex + '">');
    this.writeln(indent + 1, '<name>Lap ' + lapNumber + '</name>');
    this.writeln(indent + 1, '<visibility>1</visibility>');
    this.writeln(indent + 1, '<styleUrl>#LapMarker</styleUrl>');
    this.writeln(indent + 1, '<Point>');
    const alt = coord.altitude ?? 0;
    this.writeln(indent + 2, `<coordinates>${coord.lng},${coord.lat},${alt}</coordinates>`);
    this.writeln(indent + 1, '</Point>');
    this.writeln(indent, '</Placemark>');
  }

  /**
   * Writes a complete KML `<Placemark>` block for a LineString.
   *
   * @private
   * @param indent - The indentation level for the KML output.
   * @param params - The parameters for the placemark.
   */
  #placemark(indent: number, params: PlacemarkParams): void {
    this.writeln(indent, '<Placemark id="' + params.placemarkId + '">');
    this.writeln(indent + 1, '<name>' + params.name + '</name>');
    if (params.description) {
      this.writeln(indent + 1, '<description>' + params.description + '</description>');
    }

    this.writeln(indent + 1, '<visibility>1</visibility>');
    this.writeln(indent + 1, '<styleUrl>#StravaLineStyle' + params.styleName + '</styleUrl>');
    this.writeln(indent + 1, '<LineString>');
    this.writeln(indent + 2, '<tessellate>1</tessellate>');
    if (params.coordinates && params.coordinates.length) {
      this.writeln(indent + 2, '<coordinates>');
      params.coordinates.forEach((coord) => {
        // KML format is: longitude,latitude,altitude
        const alt = coord.altitude ?? 0;
        this.write(0, `${coord.lng},${coord.lat},${alt} `);
      });
      this.writeln(indent + 2, '</coordinates>');
    }
    this.writeln(indent + 1, '</LineString>');
    this.writeln(indent, '</Placemark>');
  }
}
