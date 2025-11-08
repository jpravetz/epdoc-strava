import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import type * as Ctx from '../context.ts';
import type { Api } from '../dep.ts';
import { escapeHtml, Fmt } from '../fmt.ts';
import type * as Segment from '../segment/mod.ts';
import { isValidActivityType, isValidLineStyle } from './guards.ts';
import { defaultLineStyles } from './linestyles.ts';
import type * as Kml from './types.ts';

type Activity = Api.Activity.Base;
type SegmentData = Segment.Data;
type PlacemarkParams = Kml.PlacemarkParams;

const REGEX = {
  color: /^[a-zA-Z0-9]{8}$/,
  moto: /^moto$/i,
};

export class KmlMain {
  private opts: Kml.Opts = {};
  private lineStyles: Kml.LineStyleDefs = defaultLineStyles;
  private buffer: string = '';
  private writer?: FS.Writer;
  private trackIndex: number = 0;

  constructor(opts: Kml.Opts = {}) {
    this.opts = opts;
  }

  setOptions(opts: Kml.Opts = {}) {
    this.opts = opts;
  }

  get imperial(): boolean {
    return this.opts && this.opts.imperial === true;
  }

  get more(): boolean {
    return this.opts && this.opts.more === true;
  }

  public setLineStyles(ctx: Ctx.Context, styles: Kml.LineStyleDefs) {
    Object.entries(styles).forEach(([name, style]) => {
      if (isValidActivityType(name) && isValidLineStyle(style)) {
        this.lineStyles[name] = style;
      } else {
        ctx.log.warn.warn('Warning: ignoring line style error')
          .value(name).text('Style must be in form \'{ "color": "C03030C0", "width": 2 }\'').emit();
      }
    });
  }

  async outputData(
    ctx: Ctx.Context,
    filepath: string,
    activities: Activity[],
    segments: SegmentData[],
  ): Promise<void> {
    const m0 = ctx.log.mark();
    const file = filepath || 'Activities.kml';
    const fsFile: FS.File = new FS.File(FS.Folder.cwd(), filepath);
    this.writer = await fsFile.writer();

    try {
      await this.header();

      if (this.opts.activities) {
        await this.addActivities(activities);
      }

      if (this.opts.segments) {
        await this.addSegments(segments);
      }

      await this.footer();
      await this.writer.close();

      ctx.log.verbose.text('Wrote').fs(file).ewt(m0);
    } catch (err) {
      if (this.writer) {
        await this.writer.close();
      }
      throw err;
    }
  }

  private async addActivities(activities: Activity[]): Promise<void> {
    if (activities && activities.length) {
      const dateString = this._dateString();

      const indent = 2;
      this.writeln(
        indent,
        '<Folder><name>Activities' + (dateString ? ' ' + dateString : '') + '</name><open>1</open>',
      );

      for (const activity of activities) {
        if (activity.hasKmlData()) {
          this.outputActivity(indent + 1, activity);
        }
        await this.flush();
      }

      this.writeln(indent, '</Folder>');
      await this.flush();
    }
  }

  private _dateString(): string {
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

  public outputSegments(indent: number, segments: SegmentData[], country?: string, state?: string): void {
    let title = 'Segments';
    const dateString = this._dateString();
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
        this.outputSegment(indent + 2, segment);
      }
    });
    this.writeln(indent, '</Folder>');
  }

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

  public outputActivity(indent: number, activity: Activity): void {
    const t0 = activity.startDateLocal.slice(0, 10);
    let styleName = 'Default';

    const bike = activity.gearId && this.opts.bikes ? this.opts.bikes[activity.gearId] : undefined;
    const isMoto: boolean =
      bike && typeof bike === 'object' && 'name' in bike && typeof bike.name === 'string'
        ? REGEX.moto.test(bike.name)
        : false;

    if (isMoto) {
      styleName = 'Moto';
    } else if (activity.commute && defaultLineStyles['Commute']) {
      styleName = 'Commute';
    } else if (defaultLineStyles[activity.type]) {
      styleName = activity.type;
    }

    const params: PlacemarkParams = {
      placemarkId: 'StravaTrack' + ++this.trackIndex,
      name: t0 + ' - ' + escapeHtml(activity.name),
      description: this._buildActivityDescription(activity),
      styleName: styleName,
      coordinates: activity.coordinates,
    };
    this.placemark(indent, params);

    // Output lap markers if laps are enabled and available
    if (this.opts.laps && 'laps' in activity.data && _.isArray(activity.data.laps)) {
      this._outputLapMarkers(indent, activity);
    }
  }

  private _buildActivityDescription(activity: Activity): string | undefined {
    if (!this.more) {
      return undefined;
    }

    // TODO: Implement full activity description with:
    // - distance (using Fmt.getDistanceString)
    // - moving time / elapsed time (using @epdoc/duration formatting)
    // - elevation gain (using Fmt.getElevationString)
    // - average temp (using Fmt.getTemperatureString)
    // - segments list
    // - custom description from activity.getCustomProperties()

    const arr: string[] = [];
    arr.push(`<b>Distance:</b> ${Fmt.getDistanceString(activity.distance, this.imperial)}`);
    arr.push(`<b>Elevation Gain:</b> ${Fmt.getElevationString(activity.totalElevationGain, this.imperial)}`);

    return '<![CDATA[' + arr.join('<br>\n') + ']]>';
  }

  /**
   * Add one segment to the KML file.
   * @param segment
   * @returns {string}
   */
  private outputSegment(indent: number, segment: SegmentData): void {
    const params = {
      placemarkId: 'StravaSegment' + ++this.trackIndex,
      name: escapeHtml(segment.name),
      description: this.buildSegmentDescription(segment),
      styleName: 'Segment',
      coordinates: segment.coordinates,
    };
    this.placemark(indent, params);
  }

  private buildSegmentDescription(_segment: SegmentData) {
    return '';
  }

  private _addLineStyle(name: string, style: Kml.LineStyle): void {
    this.write(2, '<Style id="StravaLineStyle' + name + '">\n');
    this.write(
      3,
      '<LineStyle><color>' + style.color + '</color><width>' + style.width + '</width></LineStyle>\n',
    );
    this.write(3, '<PolyStyle><color>' + style.color + '</color></PolyStyle>\n');
    this.write(2, '</Style>\n');
  }

  private _addLapMarkerStyle(): void {
    this.write(2, '<Style id="LapMarker">\n');
    this.write(3, '<IconStyle>\n');
    this.write(4, '<scale>0.6</scale>\n');
    this.write(4, '<Icon>\n');
    this.write(5, '<href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>\n');
    this.write(4, '</Icon>\n');
    this.write(3, '</IconStyle>\n');
    this.write(3, '<LabelStyle>\n');
    this.write(4, '<scale>0</scale>\n'); // Hide label by default
    this.write(3, '</LabelStyle>\n');
    this.write(2, '</Style>\n');
  }

  /**
   * Output lap marker placemarks for an activity.
   * Each lap's start position is marked with a point placemark.
   */
  private _outputLapMarkers(indent: number, activity: Activity): void {
    if (!('laps' in activity.data) || !_.isArray(activity.data.laps)) {
      return;
    }

    const laps = activity.data.laps as Api.Schema.Lap[];
    const coords = activity.coordinates;

    if (!coords || coords.length === 0) {
      return;
    }

    laps.forEach((lap, index) => {
      // Get the coordinate at the lap's start index
      const startIndex = lap.start_index;
      if (startIndex >= 0 && startIndex < coords.length) {
        const coord = coords[startIndex];
        this._outputLapPoint(indent, index + 1, coord);
      }
    });
  }

  /**
   * Output a single lap marker point placemark.
   */
  private _outputLapPoint(indent: number, lapNumber: number, coord: Kml.Coord): void {
    this.writeln(indent, '<Placemark id="LapMarker' + ++this.trackIndex + '">');
    this.writeln(indent + 1, '<name>Lap ' + lapNumber + '</name>');
    this.writeln(indent + 1, '<visibility>1</visibility>');
    this.writeln(indent + 1, '<styleUrl>#LapMarker</styleUrl>');
    this.writeln(indent + 1, '<Point>');
    this.writeln(indent + 2, '<coordinates>' + coord[1] + ',' + coord[0] + ',0</coordinates>');
    this.writeln(indent + 1, '</Point>');
    this.writeln(indent, '</Placemark>');
  }

  private placemark(indent: number, params: PlacemarkParams): void {
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
        this.write(0, '' + [coord[1], coord[0], 0].join(',') + ' ');
      });
      this.writeln(indent + 2, '</coordinates>');
    }
    this.writeln(indent + 1, '</LineString>');
    this.writeln(indent, '</Placemark>');
  }

  private async header(): Promise<void> {
    this.write(0, '<?xml version="1.0" encoding="UTF-8"?>\n');
    this.writeln(
      0,
      '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">',
    );
    this.writeln(1, '<Document>');
    this.writeln(2, '<name>Strava Activities</name>');
    this.writeln(2, '<open>1</open>');
    Object.keys(this.lineStyles).forEach((name) => {
      this._addLineStyle(name, this.lineStyles[name]);
    });
    // Add lap marker style if laps are enabled
    if (this.opts.laps) {
      this._addLapMarkerStyle();
    }
    await this.flush();
  }

  private async footer(): Promise<void> {
    this.write(1, '</Document>\n</kml>\n');
    await this.flush();
  }

  private write(indent: string | number, s: string): void {
    if (_.isString(indent)) {
      this.buffer += s;
    } else {
      const indent2 = new Array(indent + 1).join('  ');
      this.buffer += indent2 + s;
    }
  }

  private writeln(indent: string | number, s: string): void {
    if (_.isString(indent)) {
      this.buffer += s + '\n';
    } else {
      const indent2 = new Array(indent + 1).join('  ');
      this.buffer += indent2 + s + '\n';
    }
    // this.buffer.write( indent + s + "\n", 'utf8' );
  }

  public async flush(): Promise<void> {
    await this._flush();
  }

  private async _flush(): Promise<void> {
    if (this.writer && this.buffer) {
      const content = this.buffer;
      this.buffer = '';
      await this.writer.write(content);
    }
  }
}
