import { DateEx } from '@epdoc/datetime';
import type { Seconds } from '@epdoc/duration';
import * as FS from '@epdoc/fs/fs';
import { _ } from '@epdoc/type';
import * as builder from 'xmlbuilder';
import type * as Ctx from '../context.ts';
import type { Activity } from '../dep.ts';
import { Fmt, formatMS } from '../fmt.ts';
import type * as BikeLog from './types.ts';

const REGEX = {
  moto: /^moto$/i,
};

/**
 * Represents a single day's worth of bikelog data for Adobe Acroforms XML output.
 * This structure maps to the XML schema expected by the bikelog PDF form.
 */
type BikelogEntry = {
  /** Julian date number used as the unique identifier for the day */
  jd: number;
  /** JavaScript Date object for the entry */
  date: Date;
  /** Array of ride events for the day (maximum 2 tracked) */
  events: Array<{
    /** Distance in kilometers, rounded to 2 decimal places */
    distance?: number;
    /** Bike identifier/name */
    bike?: string;
    /** Elevation gain in meters */
    el?: number;
    /** Moving time in hours (as decimal) */
    t?: number;
    /** Energy in watt-hours */
    wh?: number;
  }>;
  /** Primary note field containing activity descriptions */
  note0?: string;
  /** Secondary note field (currently unused) */
  note1?: string;
  /** Weight in kilograms */
  wt?: number;
};

/**
 * Generates Adobe Acroforms XML files from Strava activities for bikelog PDF forms.
 *
 * This class processes Strava activities and converts them into XML format suitable
 * for import into Adobe Acrobat PDF forms. It handles merging multiple activities per day,
 * parsing custom properties from descriptions, and extracting metadata like weight.
 *
 * @example
 * ```ts
 * const opts = { dates: dateRanges, bikes: athleteBikes };
 * const bikelog = new Bikelog(opts);
 * await bikelog.outputData(ctx, 'output.xml', activities);
 * ```
 */
export class Bikelog {
  #opts: BikeLog.OutputOpts = {};
  #writer?: FS.Writer;
  #buffer: string = '';

  /**
   * Creates a new Bikelog instance.
   * @param options Output options including date ranges, bikes, and formatting preferences
   */
  constructor(options: BikeLog.OutputOpts) {
    this.#opts = options;
  }

  /**
   * Merges activity description and private_note fields, then extracts custom properties.
   *
   * This method combines the public description and private note into a single text block,
   * then parses it for key=value pairs. Lines matching the pattern `key=value` are extracted
   * as custom properties, while remaining lines become the description. Blank lines are
   * filtered out from the final description.
   *
   * @param activity Strava activity containing description and/or private_note fields
   * @returns Dictionary with extracted custom properties and cleaned description text
   *
   * @example
   * ```ts
   * // Activity with description="weight=165 kg\nGreat ride!" and private_note="Check tire pressure"
   * const result = parseActivityText(activity);
   * // Returns: { weight: "165 kg", description: "Great ride!\nCheck tire pressure" }
   * ```
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
   * Converts a string to title case (first letter capitalized, rest lowercase).
   *
   * Used to standardize custom property keys for consistent display in bikelog output.
   * For example, "BIKE" becomes "Bike", "motor" becomes "Motor".
   *
   * @param key The string to convert
   * @returns Title-cased string, or empty string if input is empty
   *
   * @example
   * ```ts
   * toTitleCase("motor"); // Returns "Motor"
   * toTitleCase("BIKE");  // Returns "Bike"
   * toTitleCase("");      // Returns ""
   * ```
   */
  private toTitleCase(key: string): string {
    if (!key || key.length === 0) return key;
    return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  }

  /**
   * Extracts weight value from custom properties dictionary with flexible format handling.
   *
   * Searches for a "weight" key (case-insensitive) in the custom properties and
   * extracts the numeric value. Supports various common formats including bare numbers,
   * values with units, and values with/without spaces.
   *
   * @param customProps Custom properties dictionary extracted from activity description
   * @returns Weight value as number (in kilograms), or undefined if not found or invalid
   *
   * @example
   * ```ts
   * extractWeight({ weight: "165" });      // Returns 165
   * extractWeight({ weight: "165 kg" });   // Returns 165
   * extractWeight({ weight: "165kg" });    // Returns 165
   * extractWeight({ Weight: "165.5" });    // Returns 165.5 (case-insensitive)
   * extractWeight({ other: "value" });     // Returns undefined
   * ```
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
   * Combines multiple Strava activities into daily bikelog entries for PDF form output.
   *
   * This method processes an array of Strava activities and groups them by day (using Julian date
   * as the unique identifier). For each day, it creates a BikelogEntry containing:
   * - Up to 2 tracked bike ride events (distance, bike name, elevation, time, energy)
   * - Combined notes from all activities (rides and non-rides)
   * - Weight data extracted from activity descriptions
   * - Special handling for moto rides, commutes, and EBike rides
   *
   * Multiple activities on the same day are merged, with notes separated by double newlines.
   * If multiple rides use the same bike, their distances are combined into a single event.
   *
   * @param activities Array of Strava activities to process
   * @returns Dictionary of bikelog entries keyed by Julian date number
   *
   * @example
   * ```ts
   * const activities = [activity1, activity2]; // Two activities on same day
   * const entries = combineActivities(activities);
   * // Returns: { "2460234": { jd: 2460234, date: Date, events: [...], note0: "..." } }
   * ```
   */
  private combineActivities(activities: Activity[]): Record<string, BikelogEntry> {
    const result: Record<string, BikelogEntry> = {};
    activities.forEach((activity) => {
      // We are getting the JulianDay based on the local timezone, and we are doing weirdness to get there. Trust in the weirdness.
      const d: DateEx = new DateEx(activity.startDateLocal);
      const jd = d.julianDate();
      const entry: BikelogEntry = result[jd] || {
        jd: jd,
        date: new Date(activity.startDateLocal),
        events: [],
      };
      if (activity.isRide()) {
        const bike = activity.gearId && this.#opts.bikes
          ? this.#opts.bikes[activity.gearId]
          : undefined;
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

        // Add starred segment efforts at the end (if available)
        const segments = activity.segments;
        if (_.isArray(segments) && segments.length > 0) {
          const segs: string[] = [];
          let prefix = 'Up ';
          for (const segment of segments) {
            const time = segment.elapsed_time || segment.moving_time || 0;
            const timeStr = formatMS(time);
            // Use segment.name first (contains alias from app.ts), fall back to segment.segment?.name
            const name = segment.name || segment.segment?.name || 'Unknown';
            segs.push(`${prefix}${name} [${timeStr}]`);
            prefix = 'up ';
          }
          note += '\n' + segs.join(', ');
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

  /**
   * Converts a duration in seconds to a human-readable time string.
   *
   * Formats the duration as hours:minutes (e.g., "2:45" for 2 hours 45 minutes).
   * Seconds are omitted from the output for cleaner display in bikelog forms.
   *
   * @param seconds Duration in seconds
   * @returns Formatted time string in "H:MM" format
   *
   * @example
   * ```ts
   * Bikelog.secondsToString(9000);  // Returns "2:30" (2 hours 30 minutes)
   * Bikelog.secondsToString(3661);  // Returns "1:01" (1 hour 1 minute)
   * Bikelog.secondsToString(45);    // Returns "0:00" (under 1 minute)
   * ```
   */
  public static secondsToString(seconds: Seconds): string {
    return Fmt.hms(seconds, { seconds: false });
  }

  /**
   * Maps Strava bike names to custom bikelog display names based on user configuration.
   *
   * Allows users to specify custom short names for their bikes in the PDF output.
   * For example, mapping "Trek Domane AL 3 Disc" to "Trek" for cleaner display.
   * Matching is case-insensitive. If no mapping is found, returns the original name.
   *
   * @param stravaBikeName The bike name from Strava's gear data
   * @returns Mapped bike name from selectedBikes configuration, or original name if no match
   *
   * @example
   * ```ts
   * // With opts.selectedBikes = [{ pattern: "Trek Domane", name: "Trek" }]
   * bikeMap("Trek Domane AL 3");  // Returns "Trek"
   * bikeMap("Specialized");       // Returns "Specialized" (no mapping)
   * ```
   */
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

  /**
   * Generates Adobe Acroforms XML file from Strava activities for bikelog PDF import.
   *
   * This is the main public method that processes Strava activities and outputs an XML file
   * formatted for import into Adobe Acrobat PDF forms. The method performs the following steps:
   * 1. Combines activities by day (using Julian dates as unique identifiers)
   * 2. Parses activity descriptions and private notes for custom properties
   * 3. Extracts weight data and other metadata
   * 4. Builds XML structure with proper Adobe Acroforms formatting
   * 5. Writes the complete XML document to the specified file
   *
   * The generated XML contains daily entries with bike ride events (distance, bike, elevation,
   * time), activity notes, and optional weight data. Multiple activities on the same day are
   * merged into a single entry.
   *
   * @param ctx Application context with logging
   * @param filepath Output file path (defaults to 'bikelog.xml')
   * @param stravaActivities Array of Strava activities to process
   *
   * @example
   * ```ts
   * const opts = { dates: dateRanges, bikes: athleteBikes };
   * const bikelog = new Bikelog(opts);
   * await bikelog.outputData(ctx, 'output/bikelog.xml', activities);
   * // Creates XML file ready for Adobe Acrobat PDF form import
   * ```
   */
  public async outputData(
    ctx: Ctx.Context,
    filepath: string,
    stravaActivities: Activity[],
  ): Promise<void> {
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

      ctx.log.verbose.text('Wrote').count(xmlContent.length).text('byte').text('to').fs(filepath)
        .ewt(m0);
    } catch (err) {
      if (this.#writer) {
        await this.#writer.close();
      }
      throw err;
    }
  }
}
