import fs from 'fs';
import { SegmentName } from './models/segment-base';
import { SummarySegment } from './models/summary-segment';
import { StravaApi } from './strava-api';
import { FilePath, LogFunction, Metres, readJson, writeJson } from './util';

export type GpsDegrees = number;

export type SegmentCacheEntry = {
  name?: SegmentName;
  distance?: Metres;
  gradient?: number;
  elevation?: Metres;
};

export class SegmentFile {
  private _filepath: FilePath;
  private _api: StravaApi;
  private _lastModified: Date;
  private _segments: Record<string, SegmentCacheEntry> = {};
  private _log: LogFunction;

  constructor(filepath: FilePath, stravaApi: StravaApi, opts?: { log?: LogFunction }) {
    this._filepath = filepath;
    this._api = stravaApi;
    this._log = opts.log ? opts.log : (msg) => {};
  }

  public async get(opts: { refresh?: boolean }): Promise<void> {
    this._log('Retrieving list of starred segments');
    if (opts.refresh) {
      return this.refresh();
    } else {
      return this.read().catch((err) => {
        this._log(`  Error reading starred segments from ${this._filepath}`);
        this._log('    ' + err.message);
        return this.getFromServer().then(() => {
          return this.write();
        });
      });
    }
  }

  /**
   * Refresh the list of segments from the server.
   */
  public async refresh(): Promise<void> {
    return this.getFromServer().then((resp) => {
      return this.write();
    });
  }

  public async read(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(this._filepath)) {
        fs.stat(this._filepath, (err, stats) => {
          if (err) {
            reject(err);
          } else {
            this._lastModified = stats.mtime;
            readJson(this._filepath)
              .then((resp) => {
                if (resp.segments) {
                  this._segments = resp.segments;
                }
                this._log(`Read ${Object.keys(this._segments).length} starred segments from ${this._filepath}`);
                resolve();
              })
              .catch((err) => {
                reject(err);
              });
          }
        });
      } else {
        reject(new Error('File not found'));
      }
    });
  }

  private async getFromServer(): Promise<void> {
    // this.starredSegments = [];
    const summarySegments: SummarySegment[] = [];
    this._log('  Retrieving starred segments from Strava ...');
    return this._api
      .getStarredSegments(summarySegments)
      .then(() => {
        // this._segments = resp;
        this._log(`  Found ${summarySegments.length} starred segments`);
        this._segments = {};
        summarySegments.forEach((seg) => {
          const newEntry = seg.asCacheEntry();
          if (this._segments[seg.name]) {
            this._log(
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
      segments: this._segments,
    };
    return writeJson(this._filepath, json).then((resp) => {
      this._log(`Wrote ${Object.keys(this._segments).length} starred segments to ${this._filepath}`);
    });
  }

  public getSegment(name: string): SegmentCacheEntry {
    return this._segments[name];
  }
}
