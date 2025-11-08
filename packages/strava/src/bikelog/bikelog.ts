import { DateEx } from '@epdoc/datetime';
import type { Seconds } from '@epdoc/duration';
import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import * as builder from 'xmlbuilder';
import type { Api } from '../dep.ts';
import { Fmt } from '../fmt.ts';
import type * as BikeLog from './types.ts';

type Activity = Api.Activity.Base;

const REGEX = {
  moto: /^moto$/i,
};

/**
 * Interface to bikelog XML data that can be read/written from PDF files using
 * Acrobat.
 */
type BikelogEntry = {
  jd: number;
  date: Date;
  events: Array<{
    distance?: number;
    bike?: string;
    el?: number;
    t?: number;
    wh?: number;
  }>;
  note0?: string;
  note1?: string;
  wt?: number;
};

export class Bikelog {
  private opts: BikeLog.OutputOpts = {};
  private writer?: FS.Writer;
  private buffer: string = '';
  private verbose: number = 9;

  constructor(options: BikeLog.OutputOpts) {
    this.opts = options;
    if (_.isNumber(options.verbose)) {
      this.verbose = options.verbose;
    }
  }

  /**
   * Combine strava activities into per-day information that is suitable for Acroform bikelog.
   * @param activities Array of strava activities.
   * @returns {{}} Dictionary of bikelog data, with keys set to julian day.
   */
  private combineActivities(activities: Activity[]): Record<string, BikelogEntry> {
    const result: Record<string, BikelogEntry> = {};
    activities.forEach((activity) => {
      const d: DateEx = new DateEx(activity.startDateLocal);
      const jd = d.julianDate();
      const entry: BikelogEntry = result[jd] || {
        jd: jd,
        date: new Date(activity.startDateLocal),
        events: [],
      };
      // Note: wt (weight) is not in the standard Strava schema
      // if (activity.data.wt) {
      //   entry.wt = activity.data.wt;
      // }
      if (activity.isRide()) {
        const bike = activity.gearId && this.opts.bikes ? this.opts.bikes[activity.gearId] : undefined;
        const isMoto: boolean =
          bike && typeof bike === 'object' && 'name' in bike && typeof bike.name === 'string'
            ? REGEX.moto.test(bike.name)
            : false;
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
          note += `\nDistance: ${activity.distanceRoundedKm()}, Elevation: ${
            Math.round(activity.totalElevationGain)
          }`;
        } else if (activity.commute) {
          note += 'Commute: ' + activity.name;
        } else if (activity.type === 'EBikeRide') {
          note += 'EBike: ' + activity.name;
        } else {
          note += 'Bike: ' + activity.name;
        }
        note += times.length ? '\n' + times.join(', ') : '';

        // TODO: Add EBike energy data from detailed activity
        // TODO: Add custom description from getCustomProperties()
        // TODO: Add segments list from activity.segments

        if (entry.note0) {
          entry.note0 += '\n' + note;
        } else {
          entry.note0 = note;
        }

        // Only track non-moto bike rides in events
        if (bike && !isMoto && typeof bike === 'object' && 'name' in bike) {
          const dobj = {
            distance: activity.distanceRoundedKm(),
            bike: this.bikeMap(bike.name as string),
            el: Math.round(activity.totalElevationGain),
            t: Math.round(activity.movingTime / 36) / 100,
            wh: 0, // TODO: Add kilojoules support from detailed activity data
          };

          if (entry.events.length < 2) {
            entry.events.push(dobj);
          } else {
            let bDone = false;
            for (let idx = 1; idx >= 0 && !bDone; --idx) {
              const event = entry.events[idx];
              if (event && event.bike === dobj.bike) {
                event.distance = (event.distance || 0) + dobj.distance;
                bDone = true;
              }
            }
            if (!bDone) {
              // Could not combine, just add as new event if there's room
              if (entry.events.length < 2) {
                entry.events.push(dobj);
              }
            }
          }
        }
      } else {
        // Non-ride activities (Run, Swim, etc.)
        const distance = Math.round(activity.distance / 10) / 100;
        let note = activity.type + ': ' + activity.name + '\n';
        note += 'Distance: ' + distance + ' km; Duration: ' +
          Fmt.hms(activity.movingTime, { seconds: false });

        // TODO: Add support for custom description from getCustomProperties()

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

  public static secondsToString(seconds: Seconds): string {
    return Fmt.hms(seconds, { seconds: false });
  }

  private bikeMap(stravaBikeName: string): string {
    // Map Strava bike names to bikelog names based on selectedBikes patterns
    if (_.isArray(this.opts.selectedBikes)) {
      for (let idx = 0; idx < this.opts.selectedBikes.length; ++idx) {
        const item = this.opts.selectedBikes[idx];
        if (item.pattern.toLowerCase() === stravaBikeName.toLowerCase()) {
          return item.name;
        }
      }
    }
    return stravaBikeName;
  }

  public async outputData(filepath: string, stravaActivities: Activity[]): Promise<void> {
    filepath = filepath || 'bikelog.xml';

    // Combine activities by day
    const activities = this.combineActivities(stravaActivities);

    // Create the FileSpec and writer
    const fsFile: FS.File = new FS.File(FS.Folder.cwd(), filepath);
    this.writer = await fsFile.writer();

    try {
      console.log('Generating XML for ' + filepath);

      // Build XML document
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
            if (event.bike !== undefined) group.ele('bike', event.bike);
            if (event.distance !== undefined) group.ele('dist', event.distance);
            if (event.el !== undefined) group.ele('el', event.el);
            if (event.t !== undefined) group.ele('t', event.t);
            if (event.wh !== undefined) group.ele('wh', event.wh);
          }
        }

        if (activity.note0) {
          item.ele('note0', activity.note0);
        }
        if (activity.note1) {
          item.ele('note1', activity.note1);
        }
        if (activity.wt) {
          const wtStr = typeof activity.wt === 'string' ? activity.wt : String(activity.wt);
          item.ele('wt', wtStr.replace(/[^\d\.]/g, ''));
        }
      });

      // Generate XML string and write to file
      const xmlContent = doc.doc().end({ pretty: true });
      await this.writer.write(xmlContent);
      await this.writer.close();

      console.log(`Wrote ${xmlContent.length} bytes to ${filepath}`);
    } catch (err) {
      if (this.writer) {
        await this.writer.close();
      }
      throw err;
    }
  }
}
