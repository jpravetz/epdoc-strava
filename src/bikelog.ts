import { DateUtil, durationUtil } from 'epdoc-timeutil';
import { Dict, isArray } from 'epdoc-util';
import fs from 'fs';
import * as builder from 'xmlbuilder';
import { DateRange, LogFunctions, LogOpts, Seconds } from './types';
import { Activity } from './joins';

export type BikeDef = {
  name: string;
  pattern: string;
};

export type BikelogOutputOpts = LogOpts & {
  more?: boolean;
  dates?: DateRange[];
  imperial?: boolean;
  segmentsFlatFolder?: boolean;
  selectedBikes?: BikeDef[];
  bikes?: Dict;
};

const REGEX = {
  moto: /^moto$/i,
};

/**
 * Interface to bikelog XML data that can be read/written from PDF files using
 * Acrobat.
 */
export class Bikelog {
  private opts: BikelogOutputOpts;
  private stream: fs.WriteStream;
  private buffer: string = '';
  private verbose: number = 9;
  private _log: LogFunctions;

  constructor(options: BikelogOutputOpts) {
    this.opts = options;
    this._log = options.log;
  }

  /**
   * Combine strava activities into per-day information that is suitable for Acroform bikelog.
   * @param activities Array of strava activities.
   * @returns {{}} Dictionary of bikelog data, with keys set to julian day.
   */
  private combineActivities(activities: Activity[]) {
    const result: Dict = {};
    activities.forEach((activity) => {
      const d: Date = new Date(activity.startDateLocal);
      const jd = new DateUtil(d).julianDate();
      const entry = result[jd] || { jd: jd, date: new Date(activity.startDateLocal), events: [] };
      if (activity.data.wt) {
        entry.wt = activity.data.wt;
      }
      if (activity.isRide()) {
        const bike: Dict = activity.gearId ? this.opts.bikes[activity.gearId] : undefined;
        const isMoto: boolean = bike ? REGEX.moto.test(bike.name) : false;
        let note = '';
        // note += 'Ascend ' + Math.round(activity.total_elevation_gain) + 'm, time ';
        // note += this.formatHMS(activity.moving_time, { seconds: false });
        // note += ' (' + this.formatHMS(activity.elapsed_time, { seconds: false }) + ')';
        const times: string[] = [];
        if (activity.movingTime) {
          times.push('Moving: ' + Bikelog.secondsToString(activity.movingTime));
        }
        if (activity.elapsedTime) {
          times.push('Elapsed: ' + Bikelog.secondsToString(activity.elapsedTime));
        }
        if (isMoto) {
          note += 'Moto: ' + activity.name;
          note += `\nDistance: ${activity.distanceRoundedKm()}, Elevation: ${Math.round(activity.totalElevationGain)}`;
        } else if (activity.commute) {
          note += 'Commute: ' + activity.name;
        } else if (activity.type === 'EBikeRide') {
          note += 'EBike: ' + activity.name;
        } else {
          note += 'Bike: ' + activity.name;
        }
        note += times.length ? '\n' + times.join(', ') : '';
        if (!isMoto && activity.type === 'EBikeRide') {
          if (activity.data.kilojoules) {
            note += '\nBiker Energy: ' + Math.round(activity.data.kilojoules / 3.6) + ' Wh';
            if (activity.data.max_watts) {
              note += '; Max: ' + activity.data.max_watts + ' W';
            }
          }
        }
        if (activity.description) {
          note += '\n' + activity.description;
        }
        if (Array.isArray(activity.segments)) {
          const segs = [];
          let up = 'Up ';
          activity.segments.forEach((segment) => {
            segs.push(up + segment.name + ' [' + durationUtil(segment.movingTime).format() + ']');
            up = 'up ';
          });
          note += '\n' + segs.join(', ') + '\n';
        }

        if (entry.note0) {
          entry.note0 += note;
        } else {
          entry.note0 = note;
        }
        let dobj: Dict;
        if (bike && !isMoto) {
          dobj = {
            distance: activity.distanceRoundedKm(),
            bike: this.bikeMap(bike.name),
            el: Math.round(activity.totalElevationGain),
            t: Math.round(activity.movingTime / 36) / 100,
            wh: Math.round(activity.data.kilojoules / 3.6),
          };
        }
        if (entry.events.length < 2) {
          entry.events.push(dobj);
        } else {
          let bDone = false;
          for (let idx = 1; idx >= 0 && !bDone; --idx) {
            if (entry.events[idx].bike === dobj.bike) {
              entry.events[idx].distance += dobj.distance;
              bDone = true;
            }
          }
        }
      } else {
        const distance = Math.round(activity.distance / 10) / 100;
        let note = activity.type + ': ' + activity.name + '\n';
        note +=
          'Distance: ' +
          distance +
          ' km; Duration: ' +
          durationUtil(activity.movingTime).format({ s: false, ms: false });
        if (activity.description) {
          note += '\n' + activity.description;
        }
        if (entry.note0) {
          entry.note0 += '\n' + note;
        } else {
          entry.note0 = note;
        }
      }
      result[jd] = entry;
    });
    return result;
  }

  public static secondsToString(seconds: Seconds) {
    return durationUtil(seconds * 1000).format({ s: false, ms: false });
  }

  public outputData(filepath: string, stravaActivities: Activity[]): Promise<void> {
    const self = this;
    filepath = filepath ? filepath : 'bikelog.xml';
    let dateString: string;
    if (Array.isArray(this.opts.dates)) {
      const ad: string[] = [];
      this.opts.dates.forEach((range) => {
        ad.push(range.after + ' to ' + range.before);
      });
      dateString = ad.join(', ');
    }

    this.buffer = ''; // new Buffer(8*1024);

    const activities = this.combineActivities(stravaActivities);

    return new Promise((resolve, reject) => {
      // @ts-ignore
      self.stream = fs.createWriteStream(filepath);
      // self.stream = fs.createWriteStream('xxx.xml');
      self.stream.once('open', (fd) => {
        this._log.info('Open ' + filepath);
        const doc = builder
          .create('fields', { version: '1.0', encoding: 'UTF-8' })
          .att('xmlns:xfdf', 'http://ns.adobe.com/xfdf-transition/')
          .ele('day');
        Object.keys(activities).forEach((key) => {
          const activity = activities[key];
          const item = doc.ele('group').att('xfdf:original', activity.jd);
          for (let idx = 0; idx < Math.min(activity.events.length, 2); ++idx) {
            const event = activity.events[idx];
            if (event) {
              const group = item.ele('group').att('xfdf:original', idx);
              group.ele('bike', event.bike);
              group.ele('dist', event.distance);
              group.ele('el', event.el);
              group.ele('t', event.t);
              group.ele('wh', event.wh);
            }
          }
          if (activity.note0) {
            item.ele('note0', activity.note0);
          }
          if (activity.note1) {
            item.ele('note1', activity.note1);
          }
          if (activity.wt) {
            item.ele('wt', activity.wt.replace(/[^\d\.]/g, ''));
          }
        });
        const s = doc.doc().end({ pretty: true });
        self.stream.write(s);
        self.stream.end();
        this._log.info(`Wrote ${s.length} bytes to ${filepath}`);
      });

      self.stream.once('error', (err) => {
        self.stream.end();
        err.message = 'Stream error ' + err.message;
        reject(err);
      });
      self.stream.once('close', () => {
        this._log.info('Close ' + filepath);
        resolve();
      });
      self.stream.on('finish', () => {
        this._log.info('Finish ' + filepath);
      });
    });
  }

  public write(indent, s): void {
    if (typeof indent === 'string') {
      this.buffer += s;
    } else {
      const indent2 = new Array(indent + 1).join('  ');
      this.buffer += indent2 + s;
    }
    // this.buffer.write( indent + s, 'utf8' );
  }

  public writeln(indent, s): void {
    if (typeof indent === 'string') {
      this.buffer += s + '\n';
    } else {
      const indent2 = new Array(indent + 1).join('  ');
      this.buffer += indent2 + s + '\n';
    }
    // this.buffer.write( indent + s + "\n", 'utf8' );
  }

  public flush(): Promise<void> {
    this._log.verbose(`  Flushing ${this.buffer.length} bytes`);
    return this._flush();
  }

  private _flush(): Promise<void> {
    return new Promise((resolve, reject) => {
      const bOk = this.stream.write(this.buffer);
      this.buffer = '';
      if (bOk) {
        resolve();
      } else {
        this._log.verbose('  Waiting on drain event');
        this.stream.once('drain', () => {
          return this.flush();
        });
      }
    });
  }

  public bikeMap(stravaBikeName: string): string {
    if (isArray(this.opts.selectedBikes)) {
      for (let idx = 0; idx < this.opts.selectedBikes.length; ++idx) {
        const item = this.opts.selectedBikes[idx];
        if (item.pattern.toLowerCase() === stravaBikeName.toLowerCase()) {
          return item.name;
        }
      }
    }
    return stravaBikeName;
  }
}
