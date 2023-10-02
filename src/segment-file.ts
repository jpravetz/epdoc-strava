import fs from 'fs';
import { SegmentName } from './models/segment-base';
import { SummarySegment } from './models/summary-segment';
import { StravaApi } from './strava-api';
import { FilePath, IsoDateString, LogFunctions, LogOpts, Metres, readJson, writeJson } from './util';
import { isDict } from 'epdoc-util';
import { dateUtil } from 'epdoc-timeutil';

export type GpsDegrees = number;

export type SegmentCacheEntry = {
  name?: SegmentName;
  distance?: Metres;
  gradient?: number;
  elevation?: Metres;
};
export type SegmentCacheDict = Record<SegmentName, SegmentCacheEntry>;
export type SegmentCacheFileData = {
  type: 'segment.cache';
  description?: string;
  lastModified?: IsoDateString;
  segments: SegmentCacheDict;
};
export function isSegementCacheEntry(val: any): val is SegmentCacheEntry {
  return isDict(val);
}
export function isSegementCacheDict(val: any): val is SegmentCacheDict {
  return isDict(val);
}
export function isSegementCacheFileData(val: any): val is SegmentCacheFileData {
  return isDict(val) && val.type === 'segment.cache' && isSegementCacheDict(val.segments);
}

/**
 * Object representing a Segment Cache file.
 */
export class SegmentFile {
  private _filepath: FilePath;
  private _api: StravaApi;
  private _lastModified: Date;
  private _segments: SegmentCacheDict = {};
  private _log: LogFunctions;

  /**
   * Create a SegmentFile object. A SegmentFile represents a file, and in-memory
   * data for that file, that contains a cached list of all our starred
   * segements. Segments are starred using the Strava UI. We use the Strava API
   * to downlost the list of starred segments.
   * @param filepath Full path to the segements cache file
   * @param stravaApi A reference to our Strava API that we will possibly use to
   * update the cache from the server.
   * @param opts Options, includes a logger.
   */
  constructor(filepath: FilePath, stravaApi: StravaApi, opts: LogOpts) {
    this._filepath = filepath;
    this._api = stravaApi;
    this._log = opts.log;
  }

  /**
   * Retrieve the list of starred segments. Use the cached version unless it is
   * empty or `opts.refresh` is true.∑
   * @param opts.refresh If `true` then will refresh the list of starred
   * segments from the server, and write them out to our cache. Otherwise will
   * read the segment cache file that contains the cached list of starred
   * segments and only get the list of starred segments from the server if the
   * local list does not yet exist.
   * @returns
   */
  public async get(opts: { refresh?: boolean }): Promise<void> {
    this._log.info('Retrieving list of starred segments');
    if (opts.refresh) {
      return this.refresh();
    } else {
      return this.read().then((resp) => {
        if (!this._lastModified) {
          return this.getFromServer().then(() => {
            return this.write();
          });
        }
      });
    }
  }

  /**
   * Refresh the list of segments from the server and write them out to our
   * local cache.
   */
  public async refresh(): Promise<void> {
    return this.getFromServer().then((resp) => {
      return this.write();
    });
  }

  /**
   * Read the segments cache file
   * @returns
   */
  public async read(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(this._filepath)) {
        return readJson(this._filepath)
          .then((resp) => {
            if (isSegementCacheFileData(resp)) {
              this._lastModified = new Date(resp.lastModified);
              this._segments = resp.segments;
              this._log.info(`Read ${Object.keys(this._segments).length} starred segments from ${this._filepath}`);
              resolve();
            }
          })
          .catch((err) => {
            reject(err);
          });
      } else {
        this._lastModified = null;
        this._segments = {};
      }
    });
  }

  private async getFromServer(): Promise<void> {
    // this.starredSegments = [];
    const summarySegments: SummarySegment[] = [];
    this._log.info('  Retrieving starred segments from Strava ...');
    return this._api
      .getStarredSegments(summarySegments)
      .then(() => {
        // this._segments = resp;
        this._log.info(`  Found ${summarySegments.length} starred segments`);
        this._segments = {};
        summarySegments.forEach((seg) => {
          const newEntry = seg.asCacheEntry();
          if (this._segments[seg.name]) {
            this._log.info(
              `Segment ${seg.name} (${this._segments[seg.name].distance},${
                this._segments[seg.name].elevation
              }) already exists. Overwriting with (${newEntry.distance},${newEntry.elevation}).`
            );
          }
          this._segments[seg.name] = newEntry;
        });
      })
      .catch((err) => {
        err.message = 'Starred segments - ' + err.message;
        throw err;
      });
  }

  public async write(): Promise<void> {
    const json: Record<string, any> = {
      description: 'Strava segments',
      type: 'segment.cache',
      lastModified: dateUtil().toISOLocaleString(),
      segments: this._segments,
    };
    return writeJson(this._filepath, json).then((resp) => {
      this._log.info(`Wrote ${Object.keys(this._segments).length} starred segments to ${this._filepath}`);
    });
  }

  /**
   * Retrieve a segment 
   * @param name
   * @returns 
   */
  public getSegment(name: string): SegmentCacheEntry {
    return this._segments[name];
  }
}
