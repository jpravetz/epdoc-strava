import { DateEx } from '@epdoc/datetime';
import type { Seconds } from '@epdoc/duration';
import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import * as builder from 'xmlbuilder';
import type * as Ctx from '../context.ts';
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
  #opts: BikeLog.OutputOpts = {};
  #writer?: FS.Writer;
  #buffer: string = '';

  constructor(options: BikeLog.OutputOpts) {
    this.#opts = options;
  }

  /**
   * Merges description and private_note fields, then parses for custom properties.
   * @param activity Activity to extract properties from
   * @returns Dictionary with parsed custom properties and description
   */
  private parseActivityText(activity: Activity): { description?: string; [key: string]: unknown } {
    const result: { description?: string; [key: string]: unknown } = {};

    // Merge description and private_note
    const parts: string[] = [];
    if ('description' in activity.data && _.isNonEmptyString(activity.data.description)) {
      parts.push(activity.data.description);
    }
    if ('private_note' in activity.data && _.isNonEmptyString(activity.data.private_note)) {
      parts.push(activity.data.private_note);
    }

    if (parts.length === 0) {
      return result;
    }

    // Parse merged text for key=value pairs
    const mergedText = parts.join('\n');
    const lines: string[] = mergedText.split(/\r?\n/);
    const descLines: string[] = [];

    lines.forEach((line) => {
      const match = line.match(/^([^\s=]+)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        result[key] = value;
      } else {
        descLines.push(line);
      }
    });

    if (descLines.length) {
      // Filter out blank lines
      const nonBlankLines = descLines.filter((line) => line.trim().length > 0);
      if (nonBlankLines.length) {
        result.description = nonBlankLines.join('\n');
      }
    }

    return result;
  }

  /**
   * Converts a key to title case (first letter capitalized).
   * @param key The key to convert
   * @returns Title-cased key
   */
  private toTitleCase(key: string): string {
    if (!key || key.length === 0) return key;
    return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  }

  /**
   * Extracts weight value from custom properties (case-insensitive).
   * Handles formats like "165", "165 kg", "165kg".
   * @param customProps Custom properties dictionary
   * @returns Weight value as number, or undefined
   */
  private extractWeight(customProps: Record<string, unknown>): number | undefined {
    for (const [key, value] of Object.entries(customProps)) {
      if (key.toLowerCase() === 'weight' && value !== undefined) {
        const strValue = String(value).trim();
        // Remove " kg" or "kg" suffix if present
        const numStr = strValue.replace(/\s*kg$/i, '');
        const num = parseFloat(numStr);
        return isNaN(num) ? undefined : num;
      }
    }
    return undefined;
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
      if (activity.isRide()) {
        const bike = activity.gearId && this.#opts.bikes ? this.#opts.bikes[activity.gearId] : undefined;
        const isMoto: boolean =
          bike && typeof bike === 'object' && 'name' in bike && typeof bike.name === 'string'
            ? REGEX.moto.test(bike.name)
            : false;
        let note = '';
        // note += 'Ascend ' + Math.round(activity.total_elevation_gain) + 'm, time ';
        // note += this.formatHMS(activity.moving_time, { seconds: false });
        // note += ' (' + this.formatHMS(activity.elapsed_time, { seconds: false }) + ')';

        // Build activity name line
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

        // Add timing metadata first (before description)
        const times: string[] = [];
        if (activity.movingTime) {
          times.push('Moving: ' + Bikelog.secondsToString(activity.movingTime));
        }
        if (activity.elapsedTime) {
          times.push('Elapsed: ' + Bikelog.secondsToString(activity.elapsedTime));
        }
        if (times.length) {
          note += '\n' + times.join(', ');
        }

        // TODO: Add EBike energy data from detailed activity
        // TODO: Add segments list from activity.segments

        // Add custom description and private note from activity (if available)
        const customProps = this.parseActivityText(activity);

        // Extract weight if present and set entry.wt
        const weight = this.extractWeight(customProps);
        if (weight !== undefined) {
          entry.wt = weight;
        }

        // Add description text first
        if (customProps.description && _.isString(customProps.description)) {
          note += '\n' + customProps.description;
        }

        // Add all other key/value pairs (excluding description and weight)
        for (const [key, value] of Object.entries(customProps)) {
          if (key !== 'description' && key.toLowerCase() !== 'weight' && value !== undefined) {
            note += '\n' + this.toTitleCase(key) + ': ' + String(value);
          }
        }

        if (entry.note0) {
          entry.note0 += '\n\n' + note;
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

        // Add custom description and private note from activity (if available)
        const customProps = this.parseActivityText(activity);

        // Extract weight if present and set entry.wt
        const weight = this.extractWeight(customProps);
        if (weight !== undefined) {
          entry.wt = weight;
        }

        // Add description text first
        if (customProps.description && _.isString(customProps.description)) {
          note += '\n' + customProps.description;
        }

        // Add all other key/value pairs (excluding description and weight)
        for (const [key, value] of Object.entries(customProps)) {
          if (key !== 'description' && key.toLowerCase() !== 'weight' && value !== undefined) {
            note += '\n' + this.toTitleCase(key) + ': ' + String(value);
          }
        }

        if (entry.note0) {
          entry.note0 += '\n\n' + note;
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
    if (_.isArray(this.#opts.selectedBikes)) {
      for (let idx = 0; idx < this.#opts.selectedBikes.length; ++idx) {
        const item = this.#opts.selectedBikes[idx];
        if (item.pattern.toLowerCase() === stravaBikeName.toLowerCase()) {
          return item.name;
        }
      }
    }
    return stravaBikeName;
  }

  public async outputData(ctx: Ctx.Context, filepath: string, stravaActivities: Activity[]): Promise<void> {
    filepath = filepath || 'bikelog.xml';

    // Combine activities by day
    const activities = this.combineActivities(stravaActivities);

    // Create the FileSpec and writer
    const fsFile: FS.File = new FS.File(FS.Folder.cwd(), filepath);
    this.#writer = await fsFile.writer();

    try {
      ctx.log.verbose.text('Generating XML file').fs(filepath).emit();
      const m0 = ctx.log.mark();

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
      await this.#writer.write(xmlContent);
      await this.#writer.close();

      ctx.log.verbose.text('Wrote').count(xmlContent.length).text('byte').text('to').fs(filepath).ewt(m0);
    } catch (err) {
      if (this.#writer) {
        await this.#writer.close();
      }
      throw err;
    }
  }
}
