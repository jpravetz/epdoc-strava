import { type Dict } from '@epdoc/ActivityType';
import * as FS from '@epdoc/fs/fs';
import { isValidActivityType, isValidLineStyle } from './guards.ts';
import { defaultLineStyles } from './linestyles.ts';
import { Main } from './main';
import { Activity } from './models/activity';
import { SegmentData } from './models/segment-data';
import * as Kml from './types.ts';

const REGEX = {
  color: /^[a-zA-Z0-9]{8}$/,
  moto: /^moto$/i,
};

export class KmlMain {
  private main: Main;
  private opts: Kml.Opts;
  private lineStyles: Kml.LineStyleDefs = defaultLineStyles;
  private buffer: string = '';
  private stream: fs.WriteStream;
  private trackIndex: number = 0;

  constructor(opts: Kml.Opts = {}) {
    this.opts = opts;
  }

  get imperial(): boolean {
    return this.opts && this.opts.imperial === true;
  }

  get more(): boolean {
    return this.opts && this.opts.more === true;
  }

  public setLineStyles(styles: Kml.LineStyleDefs) {
    Object.entries(styles).forEach(([name, style]) => {
      if (isValidActivityType(name) && isValidLineStyle(style)) {
        this.lineStyles[name] = style;
      } else {
        console.log(
          'Warning: ignoring line style error for %s. Style must be in form \'{ "color": "C03030C0", "width": 2 }\'',
          name,
        );
      }
    });
  }

  public outputData(filepath: string, activities: Activity[], segments: SegmentData[]): Promise<void> {
    const file = filepath || 'Activities.kml';
    const fsFile: FS.File = new FS.File(FS.Folder.cwd(), filepath);

    return new Promise((resolve, reject) => {
      this.stream = fs.createWriteStream(file);

      this.stream.once('open', (fd) => {
        this.header()
          .then((resp) => {
            if (this.opts.activities) {
              return this.addActivities(activities);
            }
          })
          .then((resp) => {
            if (this.opts.segments) {
              return this.addSegments(segments);
            }
          })
          .then((resp) => {
            return this.footer();
          })
          .then((resp) => {
            this.stream.end();
            console.log('Wrote ' + file);
          });
      });

      this.stream.once('error', (err) => {
        this.stream.end();
        err.message = 'Stream error ' + err.message;
        reject(err);
      });
      this.stream.once('close', () => {
        console.log('Close ' + file);
        resolve();
      });
      this.stream.on('finish', () => {
        console.log('Finish ' + file);
      });
      this.stream.on('drain', () => {
        this._flush();
      });
    });
  }

  private async addActivities(activities: Activity[]): Promise<void> {
    if (activities && activities.length) {
      const dateString = this._dateString();

      const indent = 2;
      this.writeln(
        indent,
        '<Folder><name>Activities' + (dateString ? ' ' + dateString : '') + '</name><open>1</open>',
      );

      return activities
        .reduce((promiseChain, activity: Activity) => {
          return promiseChain.then(() => {
            const job = Promise.resolve().then(() => {
              if (activity.hasKmlData()) {
                this.outputActivity(indent + 1, activity);
              }
              return this.flush();
            });
            return job;
          });
        }, Promise.resolve())
        .then((resp) => {
          this.writeln(indent, '</Folder>');
          return this.flush();
        });
    }
    return Promise.resolve();
  }

  private _dateString() {
    if (Array.isArray(this.opts.dates)) {
      const ad = [];
      this.opts.dates.forEach((range) => {
        ad.push(range.after + ' to ' + range.before);
      });
      return ad.join(', ');
    }
    return '';
  }

  public addSegments(segments: SegmentData[]): Promise<void> {
    if (segments && segments.length) {
      const indent = 2;
      const sortedSegments: SegmentData[] = segments.sort((a, b) => {
        return compare(a, b, 'name');
      });
      if (this.opts.segmentsFlatFolder === true) {
        this.outputSegments(indent, sortedSegments);
      } else {
        const regions = this.getSegmentRegionList(segments);
        Object.keys(regions).forEach((country) => {
          Object.keys(regions[country]).forEach((state) => {
            this.outputSegments(indent, sortedSegments, country, state);
          });
        });
        return this.flush();
      }
    }
    return Promise.resolve();
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

  private getSegmentRegionList(segments) {
    const regions = {};
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
    const t0 = activity.startDateLocal.substr(0, 10);
    let styleName = 'Default';
    // tslint:disable-next-line: no-string-literal

    const bike: Dict = activity.gearId ? this.opts.bikes[activity.gearId] : undefined;
    const isMoto: boolean = bike ? REGEX.moto.test(bike.name) : false;

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
  }

  private _buildActivityDescription(activity: Activity): string {
    // console.log(this.opts)
    // console.log(activity.keys)
    if (this.more) {
      const arr = [];
      Object.keys(activity.keyDict).forEach((field) => {
        // console.log(field + ' = ' + activity[field]);
        if (activity[field]) {
          let key = field;
          let value = activity[field];
          if (field === 'distance') {
            value = getDistanceString(value, this.imperial);
          } else if (field === 'movingTime' || field === 'elapsedTime') {
            value = dateutil.formatMS(activity[field] * 1000, { ms: false, hours: true });
          } else if (field === 'totalElevationGain') {
            key = 'elevation_gain';
            value = getElevationString(value, this.imperial);
          } else if (field === 'averageTemp' && isNumber(value)) {
            value = getTemperatureString(value, this.imperial); //  escapeHtml("˚C");
          } else if (field === '_segments' && activity[field].length) {
            const segs = [];
            segs.push('<b>Segments:</b><br><ul>');
            activity[field].forEach((segment) => {
              const s = '<li><b>' +
                segment.name +
                ':</b> ' +
                dateutil.formatMS(segment.elapsedTime * 1000, { ms: false, hours: true }) +
                '</li>';
              segs.push(s);
            });
            segs.push('</ul>');
            arr.push(segs.join('\n'));
            value = undefined;
          } else if (field === 'description') {
            value = value.replace('\n', '<br>');
          }
          if (value) {
            arr.push('<b>' + fieldCapitalize(key) + ':</b> ' + value);
          }
        }
      });
      // console.log(arr);
      return '<![CDATA[' + arr.join('<br>\n') + ']]>';
    }
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

  private buildSegmentDescription(segment: SegmentData) {
    return '';
  }

  private _addLineStyle(name, style) {
    this.write(2, '<Style id="StravaLineStyle' + name + '">\n');
    this.write(
      3,
      '<LineStyle><color>' + style.color + '</color><width>' + style.width + '</width></LineStyle>\n',
    );
    this.write(3, '<PolyStyle><color>' + style.color + '</color></PolyStyle>\n');
    this.write(2, '</Style>\n');
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

  private header(): Promise<void> {
    this.write(0, '<?xml version="1.0" encoding="UTF-8"?>\n');
    this.write(
      1,
      '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">',
    );
    this.write(1, '<Document>\n');
    this.write(2, '<name>Strava Activities</name>\n');
    this.write(2, '<open>1</open>\n');
    Object.keys(this.lineStyles).forEach((name) => {
      this._addLineStyle(name, this.lineStyles[name]);
    });
    return this.flush();
  }

  private footer(): Promise<void> {
    this.write(1, '</Document>\n</kml>\n');
    return this.flush();
  }

  private write(indent: string | number, s: string): void {
    if (isString(indent)) {
      this.buffer += s;
    } else {
      const indent2 = new Array(indent + 1).join('  ');
      this.buffer += indent2 + s;
    }
  }

  private writeln(indent: string | number, s: string): void {
    if (isString(indent)) {
      this.buffer += s + '\n';
    } else {
      const indent2 = new Array(indent + 1).join('  ');
      this.buffer += indent2 + s + '\n';
    }
    // this.buffer.write( indent + s + "\n", 'utf8' );
  }

  public flush(): Promise<void> {
    if (this.verbose) {
      console.log('  Flushing %d bytes', this.buffer.length);
    }
    return this._flush();
  }

  private _flush(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tbuf = this.buffer;
      this.buffer = '';
      const bOk = this.stream.write(tbuf, () => {
        resolve();
      });
    });
  }
}
